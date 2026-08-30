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
import { useVitaStore } from '../store/vita-store';
import {
  extractTasks,
  breakdownTask,
  chat,
  liorHelpMeThink,
  liorRereadDump,
  LiorError,
  ExtractionResult,
  ChatMessage,
  PROCESSING_DISCLOSURE,
  LISTENING_PROMPT,
  FIRST_GREETING,
} from '../ai';

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
  const apiKey = useVitaStore((s) => s.openRouterApiKey);
  const addToScratchpad = useVitaStore((s) => s.addToScratchpad);
  const clearScratchpad = useVitaStore((s) => s.clearScratchpad);

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ScratchpadMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [overloadMode, setOverloadMode] = useState(false);

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

  async function handleSend() {
    const text = input.trim();
    if (!text || !requireKey()) return;
    setInput('');
    pushMessage('user', text);

    // Add a placeholder that we'll replace when we get a response.
    const placeholderId = `msg_${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: placeholderId, role: 'lior', text: '…', timestamp: Date.now() },
    ]);
    setIsLoading(true);

    try {
      const reply = await chat([{ role: 'user', content: text }], apiKey);
      setMessages((prev) =>
        prev.map((m) => (m.id === placeholderId ? { ...m, text: reply } : m)),
      );
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
        pushMessage('lior', reply.trim());
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
          },
        },
      ],
    );
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
        <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
          <Text style={styles.clearBtnText}>Svuota</Text>
        </TouchableOpacity>
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
