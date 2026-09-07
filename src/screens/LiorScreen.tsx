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

import React, { useState } from 'react';
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
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LiorOrb } from '../components/LiorOrb';
import { EmergencyOverlay } from '../components/EmergencyOverlay';
import { Icon } from '../design/Icon';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/NavigationRoot';
import { useTheme } from '../design/ThemeProvider';
import { Fonts } from '../design/tokens';
import { useVitaStore } from '../store/vita-store';
import type { VaultEntryType } from '../store/vita-store';
import { VoiceVisualizer } from '../components/VoiceVisualizer';
import {
  extractTasks,
  chat,
  streamChat,
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
  const s = useThemedStyles();
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const apiKey = useVitaStore((s) => s.openRouterApiKey);
  const addEntry = useVitaStore((s) => s.addEntry);
  const clearScratchpad = useVitaStore((s) => s.clearScratchpad);
  const setEmergencyMode = useVitaStore((s) => s.setEmergencyMode);
  const emergencyMode = useVitaStore((s) => s.emergencyMode);

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ScratchpadMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [overloadMode, setOverloadMode] = useState(false);
  const [lastExtraction, setLastExtraction] = useState<ExtractionResult | null>(null);
  const [volumeLevel, setVolumeLevel] = useState(0);

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

      // Context-aware: automatically extract tasks and diary items
      let extractionResult: ExtractionResult | null = null;
      try {
        extractionResult = await extractTasks(text, apiKey);
      } catch {
        // Extraction is best-effort, don't block on it
      }

      // Update final reply with extraction results
      let finalReply = fullReply;
      if (extractionResult) {
        if (extractionResult.overloadDetected) {
          speakReply('Sento che sei sovraccarico. Fermiamoci un momento.');
          setOverloadMode(true);
          finalReply += '\n\n⚠️ Sento che sei sovraccarico. Fermiamoci un momento.';
        } else if (extractionResult.items.length > 0) {
          setLastExtraction(extractionResult);
          const taskItems = extractionResult.items.filter((i) => !i.isDiary);
          const diaryItems = extractionResult.items.filter((i) => i.isDiary);
          if (taskItems.length > 0 || diaryItems.length > 0) {
            finalReply += '\n\n📋 Ho individuato:';
            if (taskItems.length > 0) {
              finalReply += '\n  • ' + taskItems.map(i => i.title).join('\n  • ');
            }
            if (diaryItems.length > 0) {
              finalReply += '\n  💭 ' + diaryItems.map(i => i.title).join('\n  💭 ');
            }
            finalReply += '\n\nTocca "Conferma" per salvare nel Vault.';
          }
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholderId ? { ...m, text: finalReply } : m,
        ),
      );
      speakReply(finalReply);
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

  // ── Voice recording handlers ─────────────────────────────────────
  async function handleStartRecording() {
    if (isRecording) {
      // Stop recording and process
      setVolumeLevel(0);
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
        },
        (volume: number) => {
          // Update volume for visualizer
          setVolumeLevel(volume);
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
    pushMessage('lior', `Salvato nel Vault: ${summary.join(' + ')}.`);
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      <KeyboardAvoidingView
        style={s.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <View style={s.topBar}>
        <Text style={s.processingBadge}>{PROCESSING_DISCLOSURE}</Text>
        <View style={s.topBarRight}>
          <TouchableOpacity
            accessibilityLabel="Svuota appuntino"
            accessibilityRole="button"
            onPress={handleClear}
            style={s.clearBtn}
          >
            <Text style={s.clearBtnText}>Svuota</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel="Impostazioni e modalità emergenza"
            accessibilityRole="button"
            onPress={() => navigation.navigate('Settings')}
            style={s.settingsBtn}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
              <Icon name="Settings" size={24} color={s.processingBadge.color} />
              <Icon name="ShieldAlert" size={24} color={s.processingBadge.color} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Orb + status ───────────────────────────────────────── */}
      <View style={s.presenceArea}>
        <LiorOrb
          state={
            emergencyMode
              ? 'emergency'
              : overloadMode
                ? 'overload'
                : isRecording || isTranscribing
                  ? 'listening'
                  : isLoading
                    ? 'thinking'
                    : 'idle'
          }
          caption={
            emergencyMode
              ? 'Modalità Emergenza — respira'
              : overloadMode
                ? 'Overload — slowing down'
                : isRecording
                  ? 'Ascolto…'
                  : isTranscribing
                    ? 'Trascrizione…'
                    : isLoading
                      ? 'Elaborazione…'
                      : messages.length === 0
                        ? FIRST_GREETING
                        : LISTENING_PROMPT
          }
        />
      </View>

      {/* ── Live Scratchpad ────────────────────────────────────── */}
      <ScrollView
        style={s.scratchpad}
        contentContainerStyle={s.scratchpadContent}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 && !isLoading && (
          <View style={s.emptyState}>
            <Text style={s.emptyHint}>
              Scrivete qualcosa e premete Invio, oppure usate i pulsanti qui sotto.
            </Text>
          </View>
        )}
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              s.msgBubble,
              msg.role === 'user' ? s.msgUser : s.msgLior,
            ]}
          >
            <Text
              style={[
                s.msgText,
                msg.role === 'user' ? s.msgTextUser : s.msgTextLior,
              ]}
            >
              {msg.text}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* ── Voice recording button ──────────────────────── */}
      {isTranscribing ? (
        <View
          accessibilityLabel="In ascolto"
          accessibilityRole="button"
          style={s.recordingInProgress}
        >
          <VoiceVisualizer volume={volumeLevel} isListening={true} />
          <Text style={[s.recordingText, { marginLeft: 4 }]}>Ascolto...</Text>
        </View>
      ) : (
        <TouchableOpacity
          accessibilityLabel={isRecording ? 'Stop registrazione vocale' : 'Registrazione vocale'}
          accessibilityRole="button"
          style={[
            s.shortcutBtn,
            isRecording && s.shortcutBtnRecordingActive,
          ]}
          onPress={handleStartRecording}
          disabled={isLoading}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {isRecording ? (
              <VoiceVisualizer volume={volumeLevel} isListening={true} />
            ) : (
              <Icon name="Mic" size={16} color={colors.textDim} />
            )}
            <Text style={[s.shortcutText, { marginLeft: 4 }]}>{isRecording ? 'Stop' : 'Voice'}</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* ── Confirm extracted items ───────────────────────────── */}
      {lastExtraction && lastExtraction.items.length > 0 && (
        <View style={s.confirmRow}>
          <Text style={s.confirmLabel}>
            {lastExtraction.items.filter((i) => !i.isDiary).length} task +{' '}
            {lastExtraction.items.filter((i) => i.isDiary).length} riflessioni
          </Text>
          <TouchableOpacity
            accessibilityLabel="Conferma tutti gli elementi estratti"
            accessibilityRole="button"
            style={s.confirmBtn}
            onPress={handleConfirmAll}
            disabled={isLoading}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Icon name="Check" size={16} color={colors.accentInk} />
                    <Text style={[s.confirmBtnText, { marginLeft: 4 }]}>Conferma</Text>
                  </View>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Input + Send ──────────────────────────────────────── */}
      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          value={input}
          onChangeText={setInput}
          placeholder="Scrivi a Lior…"
          placeholderTextColor={colors.textFaint}
          multiline={false}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          editable={!isLoading}
        />
        <TouchableOpacity
          style={[s.sendBtn, !input.trim() && s.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || isLoading}
        >
          <Icon name="ArrowUp" size={20} color={colors.accentInk} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
    <EmergencyOverlay visible={emergencyMode} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Theme-aware styles
// ─────────────────────────────────────────────────────────────────────────────

function useThemedStyles() {
  const { colors, radius, fontSize, spacing } = useTheme();
  const lowStimulus = useVitaStore((s) => s.lowStimulus);
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: lowStimulus ? colors.surface : colors.bg,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.xs,
    },
    processingBadge: {
      color: lowStimulus ? colors.textFaint : colors.textDim,
      fontSize: fontSize.mono,
      fontFamily: Fonts.mono,
      letterSpacing: 0.5,
    },
    clearBtn: {
      padding: 4,
    },
    clearBtnText: {
      color: colors.textFaint,
      fontSize: 12,
      fontFamily: Fonts.mono,
    },
    topBarRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    settingsBtn: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: lowStimulus ? colors.bg : colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
    },
    presenceArea: {
      alignItems: 'center',
      paddingVertical: spacing.md,
    },
    scratchpad: {
      flex: 1,
      paddingHorizontal: spacing.md,
    },
    scratchpadContent: {
      paddingBottom: spacing.md,
    },
    emptyState: {
      paddingVertical: 32,
      alignItems: 'center',
    },
    emptyHint: {
      color: colors.textFaint,
      fontSize: fontSize.bodySm,
      textAlign: 'center',
      lineHeight: 1.5 * fontSize.bodySm,
    },
    msgBubble: {
      maxWidth: '85%',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: radius.md,
      marginBottom: spacing.xs,
    },
    msgUser: {
      alignSelf: 'flex-end',
      backgroundColor: colors.surface,
      borderBottomRightRadius: radius.sm,
    },
    msgLior: {
      alignSelf: 'flex-start',
      backgroundColor: colors.surface2,
      borderBottomLeftRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    msgText: {
      fontSize: fontSize.body,
      lineHeight: 1.5 * fontSize.body,
    },
    msgTextUser: {
      color: colors.text,
    },
    msgTextLior: {
      color: colors.textDim,
    },
    shortcuts: {
      flexDirection: 'row',
      paddingHorizontal: spacing.xs,
      gap: spacing.xs,
      marginBottom: 6,
    },
    shortcutBtn: {
      flex: 1,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      paddingVertical: 8,
      alignItems: 'center',
    },
    shortcutText: {
      color: colors.textDim,
      fontSize: 12,
      fontWeight: '600',
    },
    shortcutBtnRecordingActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accent,
    },
    shortcutTextActive: {
      color: colors.accentInk,
    },
    recordingInProgress: {
      padding: spacing.sm,
      alignItems: 'center',
      marginBottom: 6,
    },
    recordingText: {
      color: colors.textDim,
      fontSize: 12,
    },
    confirmRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xs,
      paddingVertical: 8,
      marginHorizontal: spacing.xs,
      marginBottom: 6,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: radius.md,
    },
    confirmLabel: {
      color: colors.textDim,
      fontSize: 12,
      fontWeight: '600',
      flex: 1,
      paddingHorizontal: 8,
    },
    confirmBtn: {
      backgroundColor: colors.accent,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: radius.sm,
    },
    confirmBtnText: {
      color: colors.accentInk,
      fontSize: 13,
      fontWeight: '700',
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      gap: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.surface,
    },
    input: {
      flex: 1,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: 14,
      paddingVertical: 10,
      color: colors.text,
      fontSize: fontSize.body,
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnDisabled: {
      opacity: 0.4,
    },
  });
}
