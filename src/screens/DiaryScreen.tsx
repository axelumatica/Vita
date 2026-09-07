/**
 * src/screens/DiaryScreen.tsx
 *
 * Voice-journal "thought incinerator" screen.
 * Placeholder build: text-input + add to scratchpad.
 * Future: expo-av voice recording, on-device diary entries separate from
 * the Lior scratchpad.
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
} from 'react-native';
import { useVitaStore } from '../store/vita-store';
import { useTheme } from '../design/ThemeProvider';
import { Fonts } from '../design/tokens';
import { Icon } from '../design/Icon';
import {
  startRecording,
  stopRecording,
  cancelRecording,
  isSpeechListening,
  getActiveRecording,
} from '../services/voice-recording';

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
      fontFamily: Fonts.display,
      letterSpacing: 1.2,
      marginBottom: 8,
    },
    diaryTitle: {
      color: colors.text,
      fontSize: 22,
      fontFamily: Fonts.display,
      fontWeight: '700',
      marginBottom: 12,
      letterSpacing: -0.2,
    },
    diaryBody: {
      color: colors.textDim,
      fontSize: 15,
      lineHeight: 22,
    },
    body: { color: colors.textDim, fontSize: 15, lineHeight: 22 },
    entries: { marginTop: 8 },
    sectionLabel: {
      color: colors.textFaint,
      fontSize: 10,
      fontFamily: Fonts.mono,
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
    entryMeta: { color: colors.textFaint, fontSize: 11, fontFamily: Fonts.mono },
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
    voiceRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    voiceBtn: {
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingVertical: 10,
      paddingHorizontal: 16,
      alignItems: 'center',
      flex: 1,
    },
    voiceBtnRecordingActive: {
      borderColor: colors.accent,
      backgroundColor: colors.surface,
    },
    voiceBtnText: { color: colors.textDim, fontSize: 13, fontWeight: '600' },
    recordingInProgress: {
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: 14,
      marginBottom: 12,
      alignItems: 'center',
    },
    recordingText: { color: colors.textDim, fontSize: 13, fontStyle: 'italic' },
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
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  async function handleStartRecording() {
    if (isRecording) {
      // Stop recording - will get result via callback when speech ends
      setIsRecording(false);
      setIsTranscribing(true);
      const audioUri = await stopRecording();
      // STT result comes via voice-recording callback in LiorScreen pattern
      // For DiaryScreen, we'll just alert the user the recording stopped
      Alert.alert('Registrazione fermata', 'Audio salvato localmente.');
      return;
    }

    setIsRecording(true);
    setIsTranscribing(false);

    try {
      await startRecording(
        (result: { text: string; isFinal: boolean }) => {
          if (result.isFinal && result.text.trim() !== '') {
            setDraft((prev) => prev + (prev ? ' ' : '') + result.text);
          }
        },
        (error: { code: string; message: string }) => {
          Alert.alert('Errore riconoscimento', error.message);
          setIsRecording(false);
          setIsTranscribing(false);
        }
      );
    } catch (err) {
      Alert.alert('Errore avvio', (err as Error).message);
      setIsRecording(false);
      setIsTranscribing(false);
    }
  }

  async function handleCancelRecording() {
    isTranscribing && (setIsTranscribing(false));
    await cancelRecording();
    setIsRecording(false);
  }

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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="BookOpen" size={13} color={colors.textFaint} />
          <Text style={styles.diaryTitle}>DIARIO</Text>
        </View>
          <Text style={styles.diaryBody}>
            Scrivi senza pensare alla forma. I tuoi pensieri esatti vanno direttamente
            nello scratchpad, pronti per essere elaborati da Lior.
          </Text>
        </View>

        {isTranscribing ? (
        <View style={styles.recordingInProgress}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="Mic" size={14} color={colors.textDim} />
            <Text style={styles.recordingText}>Ascolto...</Text>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={[
            styles.voiceBtn,
            isRecording && styles.voiceBtnRecordingActive,
          ]}
          onPress={handleStartRecording}
          disabled={isRecording}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Icon name="Mic" size={14} color={colors.textDim} />
            <Text style={styles.voiceBtnText}>
              {isRecording ? 'Stop' : 'Voice'}
            </Text>
          </View>
        </TouchableOpacity>
      )}

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
          <Icon name="Plus" size={22} color={colors.accentInk} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}