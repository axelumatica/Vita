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
import { useTheme } from '../design/ThemeProvider';

/** Hook that returns theme-aware styles and the colors object for inline use. */
function useThemedStyles() {
  const { colors, radius } = useTheme();
  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 16, paddingBottom: 100 },
    introCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: 16,
      marginBottom: 16,
    },
    eyebrow: {
      color: colors.textFaint,
      fontSize: 11,
      fontFamily: 'monospace',
      letterSpacing: 0.8,
      marginBottom: 8,
    },
    body: { color: colors.textDim, fontSize: 14, lineHeight: 21 },
    entries: { marginTop: 8 },
    sectionLabel: {
      color: colors.textFaint,
      fontSize: 10,
      fontFamily: 'monospace',
      letterSpacing: 0.8,
      marginBottom: 10,
    },
    entry: {
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: 14,
      marginBottom: 8,
    },
    entryText: { color: colors.text, fontSize: 14, lineHeight: 21, marginBottom: 6 },
    entryMeta: { color: colors.textFaint, fontSize: 11, fontFamily: 'monospace' },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: colors.surface,
      backgroundColor: colors.bg,
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
      fontSize: 14,
      maxHeight: 100,
    },
    addBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addBtnDisabled: { opacity: 0.4 },
    addBtnText: { color: colors.accentInk, fontSize: 22, fontWeight: '700' },
  });

  return { styles, colors };
}

export function DiaryScreen() {
  const { styles, colors } = useThemedStyles();
  const diaryEntries = useVitaStore((s) =>
    s.vaultEntries.filter((e) => e.type === 'DIARY' && !e.isArchived),
  );
  const addEntry = useVitaStore((s) => s.addEntry);
  const [draft, setDraft] = useState('');

  function handleAdd() {
    const text = draft.trim();
    if (!text) return;
    const firstLineEnd = text.indexOf('\n');
    const title = firstLineEnd === -1 ? text.slice(0, 60) : text.slice(0, firstLineEnd);
    addEntry({
      type: 'DIARY',
      title,
      content: text,
      isArchived: false,
      projectClusterId: null,
      tags: [],
      confidence: 1.0,
      isLowConfidence: false,
    });
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

        {diaryEntries.length > 0 && (
          <View style={styles.entries}>
            <Text style={styles.sectionLabel}>ULTIMI PENSIERI</Text>
            {diaryEntries.map((entry) => (
              <View key={entry.id} style={styles.entry}>
                <Text style={styles.entryText}>{entry.content}</Text>
                <Text style={styles.entryMeta}>
                  {new Date(entry.createdAt).toLocaleTimeString('it-IT', {
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
          placeholderTextColor={colors.textFaint}
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