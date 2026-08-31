/**
 * src/screens/LiorScreen.tsx
 *
 * Lior's presence screen — the center voice tab.
 *
 * Architecture:
 *   - Dual-panel: animated orb (top) + Live Scratchpad (bottom)
 *   - NOT a chat-bubble UI (no WhatsApp/ChatGPT style feed — bubbles accumulate
 *     and cause visual clutter for ADHD users)
 *   - Text input + send as the primary interaction (voice recording via expo-av
 *     to be wired in a future session)
 *   - Responses land in the scratchpad for staging before confirmation
 *
 * Pipeline wiring:
 *   - apiKey read from VitaStore at call time
 *   - extractTasks() → for the "Extract just 1 task" button
 *   - chat()         → for general conversation
 *   - liorHelpMeThink() → for "Help me think" shortcut
 *   - liorRereadDump()  → for "Reread my dump" shortcut
 *   - overloadDetected flag → triggers the freeze-everything flow
 *
 * Future: expo-av voice recording, streaming chat via SSE.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/NavigationRoot';
import { useTheme } from '../design/ThemeProvider';
import { useVitaStore } from '../store/vita-store';
import type { VaultEntryType } from '../store/vita-store';
import {
  extractTasks,
  breakdownTask,
  chat,
  streamChat,
  liorHelpMeThink,
  liorRereadDump,
  LiorError,
  ExtractionResult,
  ChatMessage,
  PROCESSING_DISCLOSURE,
  LISTENING_PROMPT,
  FIRST_GREETING,
} from '../ai';
import { speak } from '../services/tts';
import {
  startRecording,
  stopRecording,
  cancelRecording,
  isSpeechListening,
  getActiveRecording,
  type VoiceResult,
  type VoiceError,
} from '../services/voice-recording';

// ─────────────────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────────────────

/** A message rendered in the Live Scratchpad. */
interface ScratchpadMessage {
  id: string;
  role: 'user' | 'lior';
  text: string;
  timestamp: number;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────────────────────────────────────

export function LiorScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const apiKey = useVitaStore((s) => s.openRouterApiKey);
  const addEntry = useVitaStore((s) => s.addEntry);
  const clearScratchpad = useVitaStore((s) => s.clearScratchpad);

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ScratchpadMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [overloadMode, setOverloadMode] = useState(false);
  const [lastExtraction, setLastExtraction] = useState<ExtractionResult | null>(null);

  // ── Voice recording state ─────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // ── Helpers ────────────────────────────────────────────────────────────

  function requireKey(): boolean {
    if (!apiKey) {
      Alert.alert(
        'Chiave API mancante',
        'Vai in Impostazioni per inserire la tua chiave OpenRouter.',
        [{ text: 'OK' }],
      );
      return false;
    }
    return true;
  }

  function pushMessage(role: 'user' | 'lior', text: string) {
    setMessages((prev) => [
      ...prev,
      { id: `msg_${Date.now()}`, role, text, timestamp: Date.now() },
    ]);
  }

  /** Speak Lior's reply aloud via the active voice profile. */
  async function speakReply(text: string) {
    if (!text) return;
    try {
      await speak(text);
    } catch {
      // Silent — TTS is best-effort, never block the UI on it.
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || !requireKey()) return;
    setInput('');
    pushMessage('user', text);

    // Add a placeholder that we'll update as the stream comes in.
    const placeholderId = `msg_${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: placeholderId, role: 'lior', text: '', timestamp: Date.now() },
    ]);
    setIsLoading(true);

    try {
      let fullReply = '';
      // Use streaming chat for incremental response.
      for await (const chunk of streamChat([{ role: 'user', content: text }], apiKey)) {
        if (!chunk) break; // End sentinel
        fullReply += chunk;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === placeholderId ? { ...m, text: fullReply } : m,
          ),
        );
      }
      speakReply(fullReply);
    } catch (err) {
      const msg = err instanceof LiorError ? err.message : 'Errore sconosciuto.';
      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholderId
            ? { ...m, text: `[Cloud Engine offline]\n${msg}` }
            : m,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleHelpMeThink() {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) {
      Alert.alert('Nessun messaggio', 'Scrivi qualcosa prima di chiedere.');
      return;
    }
    if (!requireKey()) return;

    pushMessage('lior', '🧠 …');
    setIsLoading(true);
    try {
      const reply = await liorHelpMeThink(lastUser.text, apiKey);
      setMessages((prev) => {
        const last = prev[prev.length - 1]!;
        return [...prev.slice(0, -1), { ...last, text: reply }];
      });
      speakReply(reply);
    } catch (err) {
      const msg = err instanceof LiorError ? err.message : 'Errore.';
      setMessages((prev) => {
        const last = prev[prev.length - 1]!;
        return [...prev.slice(0, -1), { ...last, text: `[Cloud Engine offline]\n${msg}` }];
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleExtract() {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) {
      Alert.alert('Nessun messaggio', 'Scrivi qualcosa da cui estrarre un task.');
      return;
    }
    if (!requireKey()) return;

    pushMessage('lior', '🎯 Estraggo…');
    setIsLoading(true);
    try {
      const result: ExtractionResult = await extractTasks(lastUser.text, apiKey);

      if (result.overloadDetected) {
        speakReply('Sento che sei sovraccarico. Fermiamoci un momento.');
        setOverloadMode(true);
        pushMessage(
          'lior',
          'Sento che sei sovraccarico. Fermiamoci un momento.\n\nScegli una sola micro-azione per i prossimi 10 minuti: bere un bicchiere d\'acqua, aprire una finestra, o semplicemente sdraiarsi.',
        );
        return;
      }

      if (result.items.length === 0) {
        pushMessage('lior', 'Non ho trovato task espliciti. Tutto quello che hai detto è andato nel Diario.');
      } else {
        // Store the result so the confirm button can persist it.
        setLastExtraction(result);

        const taskItems = result.items.filter((i) => !i.isDiary);
        const diaryItems = result.items.filter((i) => i.isDiary);
        let reply = '';
        if (taskItems.length > 0) {
          reply += `⚡ Task estratti (${taskItems.length}):\n`;
          taskItems.forEach((item, i) => {
            reply += `  ${i + 1}. ${item.title}\n`;
          });
        }
        if (diaryItems.length > 0) {
          reply += `\n📖 Riflessioni (${diaryItems.length}):\n`;
          diaryItems.forEach((item) => {
            reply += `  · ${item.title}\n`;
          });
        }
        reply += '\n\n👆 Tocca "Conferma" per salvare nel Vault.';
        pushMessage('lior', reply.trim());
        speakReply(reply.trim());
      }
    } catch (err) {
      const msg = err instanceof LiorError ? err.message : 'Errore.';
      setMessages((prev) => {
        const last = prev[prev.length - 1]!;
        return [...prev.slice(0, -1), { ...last, text: `[Cloud Engine offline]\n${msg}` }];
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRereadDump() {
    const dump = messages
      .filter((m) => m.role === 'user')
      .map((m) => m.text)
      .join('\n');
    if (!dump) {
      Alert.alert('Nessun messaggio', 'Scrivi qualcosa prima di chiedere.');
      return;
    }
    if (!requireKey()) return;

    pushMessage('lior', '🔍 …');
    setIsLoading(true);
    try {
      const reply = await liorRereadDump(dump, apiKey);
      setMessages((prev) => {
        const last = prev[prev.length - 1]!;
        return [...prev.slice(0, -1), { ...last, text: reply }];
      });
      speakReply(reply);
    } catch (err) {
      const msg = err instanceof LiorError ? err.message : 'Errore.';
      setMessages((prev) => {
        const last = prev[prev.length - 1]!;
        return [...prev.slice(0, -1), { ...last, text: `[Cloud Engine offline]\n${msg}` }];
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleFreezeEverything() {
    Alert.alert(
      '⛑ Ferma tutto',
      'Tutte le notifiche vengono sospese per oggi. Vuoi procedere?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Ferma',
          style: 'destructive',
          onPress: () => {
            clearScratchpad();
            setMessages([]);
            setOverloadMode(true);
          },
        },
      ],
    );
  }

  // ── Voice recording handlers ─────────────────────────────────────
  async function handleStartRecording() {
    if (isRecording) {
      // Stop recording and process
      setIsRecording(false);
      setIsTranscribing(true);

      const audioUri = await stopRecording();

      // Speech recognition will give us the result via callback
      // We just wait for the callback to fire
      return;
    }

    // Start recording
    setIsRecording(true);
    setIsTranscribing(false);

    try {
      await startRecording(
        (result: VoiceResult) => {
          // This is called when we get speech recognition results
          if (result.isFinal && result.text.trim() !== '') {
            // Put the recognized text into the input field
            setInput(result.text);

            // Auto-submit if we have text
            if (result.text.trim().length > 0) {
              handleSend();
            }
          }
        },
        (error: VoiceError) => {
          // Handle recognition errors
          Alert.alert('Errore riconoscimento', error.message);
          setIsRecording(false);
          setIsTranscribing(false);
        }
      );
    } catch (err) {
      Alert.alert('Errore avvio registrazione', (err as Error).message);
      setIsRecording(false);
      setIsTranscribing(false);
    }
  }

  function handleClear() {
    Alert.alert(
      'Svuota scratchpad?',
      'I messaggi verranno eliminati ma i task già confermati nel Vault rimangono.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Svuota',
          style: 'destructive',
          onPress: () => {
            clearScratchpad();
            setMessages([]);
            setLastExtraction(null);
          },
        },
      ],
    );
  }

  /**
   * Persist all items from the most recent extraction into vaultEntries[].
   * Items with isDiary=false become TASK entries; isDiary=true become DIARY.
   * Anything below TASK_CONFIDENCE_GATE is marked isLowConfidence.
   */
  function handleConfirmAll() {
    if (!lastExtraction || lastExtraction.items.length === 0) return;

    const TASK_CONFIDENCE_GATE = 0.9;
    let taskCount = 0;
    let diaryCount = 0;

    for (const item of lastExtraction.items) {
      const type: VaultEntryType = item.isDiary ? 'DIARY' : 'TASK';
      const isLowConfidence = !item.isDiary && item.confidence < TASK_CONFIDENCE_GATE;
      addEntry({
        type,
        title: item.title,
        content: item.rawSource || item.title,
        isArchived: false,
        projectClusterId: null,
        tags: [],
        confidence: item.confidence,
        isLowConfidence,
      });
      if (type === 'TASK') taskCount++;
      else diaryCount++;
    }

    setLastExtraction(null);
    const summary = [];
    if (taskCount > 0) summary.push(`${taskCount} task`);
    if (diaryCount > 0) summary.push(`${diaryCount} riflession${diaryCount === 1 ? 'e' : 'i'}`);
    pushMessage('lior', `✅ Salvato nel Vault: ${summary.join(' + ')}.`);
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <Text style={styles.processingBadge}>{PROCESSING_DISCLOSURE}</Text>
        <View style={styles.topBarRight}>
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>Svuota</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            style={styles.settingsBtn}
          >
            <Text style={styles.settingsBtnText}>⚙</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Orb + status ───────────────────────────────────────── */}
      <View style={styles.presenceArea}>
        <View style={styles.orb} />
        <Text style={styles.statusText}>
          {isLoading ? 'Elaborazione…' : messages.length === 0 ? FIRST_GREETING : LISTENING_PROMPT}
        </Text>
        {isLoading && <ActivityIndicator size="small" color="#F7F4EA" style={{ marginTop: 8 }} />}
      </View>

      {/* ── Live Scratchpad ────────────────────────────────────── */}
      <ScrollView
        style={styles.scratchpad}
        contentContainerStyle={styles.scratchpadContent}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 && !isLoading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyHint}>
              Scrivete qualcosa e premete Invio, oppure usate i pulsanti qui sotto.
            </Text>
          </View>
        )}
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.msgBubble,
              msg.role === 'user' ? styles.msgUser : styles.msgLior,
            ]}
          >
            <Text
              style={[
                styles.msgText,
                msg.role === 'user' ? styles.msgTextUser : styles.msgTextLior,
              ]}
            >
              {msg.text}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* ── Shortcut buttons ──────────────────────────────────── */}
      <View style={styles.shortcuts}>
        <TouchableOpacity
          style={styles.shortcutBtn}
          onPress={handleHelpMeThink}
          disabled={isLoading}
        >
          <Text style={styles.shortcutText}>🧠 Aiutami a pensare</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.shortcutBtn}
          onPress={handleExtract}
          disabled={isLoading}
        >
          <Text style={styles.shortcutText}>🎯 Estrai 1 task</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.shortcuts}>
        <TouchableOpacity
          style={styles.shortcutBtn}
          onPress={handleRereadDump}
          disabled={isLoading}
        >
          <Text style={styles.shortcutText}>🔍 Rileggi il dump</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.shortcutBtn}
          onPress={handleFreezeEverything}
          disabled={isLoading}
        >
          <Text style={styles.shortcutText}>🛑 Ferma tutto</Text>
        </TouchableOpacity>
      </View>
      {/* ── Voice recording button ──────────────────────── */}
      {isTranscribing ? (
        <View style={styles.recordingInProgress}>
          <Text style={styles.recordingText}>🎤 Ascolto...</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[
            styles.shortcutBtn,
            isRecording && styles.shortcutBtnRecordingActive,
          ]}
          onPress={handleStartRecording}
          disabled={isLoading}
        >
          <Text style={styles.shortcutText}>
            {isRecording ? '(stop) Stop' : '🎤 Voice'}
          </Text>
        </TouchableOpacity>
      )}

      {/* ── Confirm extracted items ───────────────────────────── */}
      {lastExtraction && lastExtraction.items.length > 0 && (
        <View style={styles.confirmRow}>
          <Text style={styles.confirmLabel}>
            {lastExtraction.items.filter((i) => !i.isDiary).length} task +{' '}
            {lastExtraction.items.filter((i) => i.isDiary).length} riflessioni
          </Text>
          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={handleConfirmAll}
            disabled={isLoading}
          >
            <Text style={styles.confirmBtnText}>✅ Conferma</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Input + Send ──────────────────────────────────────── */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Scrivi a Lior…"
          placeholderTextColor="#7c8299"
          multiline={false}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          editable={!isLoading}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || isLoading}
        >
          <Text style={styles.sendBtnText}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Styles (Night Vault palette — design tokens to be restored)
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B132B',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  processingBadge: {
    color: '#C5BFB0',
    fontSize: 11,
    fontFamily: 'monospace',
    letterSpacing: 0.05,
  },
  clearBtn: {
    padding: 4,
  },
  clearBtnText: {
    color: '#7c8299',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#1C2541',
    borderWidth: 1,
    borderColor: '#2A385B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsBtnText: {
    color: '#C5BFB0',
    fontSize: 14,
  },
  presenceArea: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  orb: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#F7F4EA',
    shadowColor: '#F7F4EA',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  statusText: {
    color: '#C5BFB0',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 12,
    textAlign: 'center',
  },
  scratchpad: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scratchpadContent: {
    paddingBottom: 16,
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyHint: {
    color: '#7c8299',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 1.5,
  },
  msgBubble: {
    maxWidth: '85%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    marginBottom: 8,
  },
  msgUser: {
    alignSelf: 'flex-end',
    backgroundColor: '#1C2541',
    borderBottomRightRadius: 4,
  },
  msgLior: {
    alignSelf: 'flex-start',
    backgroundColor: '#161d38',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#2A385B',
  },
  msgText: {
    fontSize: 14,
    lineHeight: 1.5,
  },
  msgTextUser: {
    color: '#F7F4EA',
  },
  msgTextLior: {
    color: '#C5BFB0',
  },
  shortcuts: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 6,
  },
  shortcutBtn: {
    flex: 1,
    backgroundColor: '#1C2541',
    borderWidth: 1,
    borderColor: '#2A385B',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  shortcutText: {
    color: '#C5BFB0',
    fontSize: 12,
    fontWeight: '600',
  },
  shortcutBtnRecordingActive: {
    borderColor: '#F7F4EA',
    backgroundColor: '#F7F4EA',
  },
  recordingInProgress: {
    padding: 12,
    alignItems: 'center',
    marginBottom: 6,
  },
  recordingText: {
    color: '#C5BFB0',
    fontSize: 12,
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 12,
    marginBottom: 6,
    backgroundColor: '#161d38',
    borderWidth: 1,
    borderColor: '#F7F4EA',
    borderRadius: 12,
  },
  confirmLabel: {
    color: '#C5BFB0',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    paddingHorizontal: 8,
  },
  confirmBtn: {
    backgroundColor: '#F7F4EA',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  confirmBtnText: {
    color: '#0B132B',
    fontSize: 13,
    fontWeight: '700',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#1C2541',
  },
  input: {
    flex: 1,
    backgroundColor: '#1C2541',
    borderWidth: 1,
    borderColor: '#2A385B',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#F7F4EA',
    fontSize: 14,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F7F4EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendBtnText: {
    color: '#0B132B',
    fontSize: 20,
    fontWeight: '700',
  },
});
