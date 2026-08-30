/**
 * src/screens/DiaryScreen.tsx
 *
 * Voice-journal "thought incinerator" screen.
 * Placeholder build: text-input + add to scratchpad.
 * Future: expo-av voice recording, on-device diary entries separate from
 * the Lior scratchpad.
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
} from 'react-native';
import { useVitaStore } from '../store/vita-store';

export function DiaryScreen() {
  const scratchpad = useVitaStore((s) => s.scratchpad);
  const addToScratchpad = useVitaStore((s) => s.addToScratchpad);
  const [draft, setDraft] = useState('');

  function handleAdd() {
    const text = draft.trim();
    if (!text) return;
    addToScratchpad(text);
    setDraft('');
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.introCard}>
          <Text style={styles.eyebrow}>📖 DIARIO</Text>
          <Text style={styles.body}>
            Scrivi senza pensare alla forma. I tuoi pensieri esatti vanno direttamente
            nello scratchpad, pronti per essere elaborati da Lior.
          </Text>
        </View>

        {scratchpad.length > 0 && (
          <View style={styles.entries}>
            <Text style={styles.sectionLabel}>ULTIMI PENSIERI</Text>
            {scratchpad.slice().reverse().map((entry) => (
              <View key={entry.id} style={styles.entry}>
                <Text style={styles.entryText}>{entry.text}</Text>
                <Text style={styles.entryMeta}>
                  {new Date(entry.timestamp).toLocaleTimeString('it-IT', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Scrivi un pensiero…"
          placeholderTextColor="#7c8299"
          multiline
          returnKeyType="default"
        />
        <TouchableOpacity
          style={[styles.addBtn, !draft.trim() && styles.addBtnDisabled]}
          onPress={handleAdd}
          disabled={!draft.trim()}
        >
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B132B',
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  introCard: {
    backgroundColor: '#1C2541',
    borderWidth: 1,
    borderColor: '#2A385B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  eyebrow: {
    color: '#7c8299',
    fontSize: 11,
    fontFamily: 'monospace',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  body: {
    color: '#C5BFB0',
    fontSize: 14,
    lineHeight: 21,
  },
  entries: {
    marginTop: 8,
  },
  sectionLabel: {
    color: '#7c8299',
    fontSize: 10,
    fontFamily: 'monospace',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  entry: {
    backgroundColor: '#161d38',
    borderWidth: 1,
    borderColor: '#2A385B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  entryText: {
    color: '#F7F4EA',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 6,
  },
  entryMeta: {
    color: '#7c8299',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#1C2541',
    backgroundColor: '#0B132B',
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
    maxHeight: 100,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F7F4EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: {
    opacity: 0.4,
  },
  addBtnText: {
    color: '#0B132B',
    fontSize: 22,
    fontWeight: '700',
  },
});
