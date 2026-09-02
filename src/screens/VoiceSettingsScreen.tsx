/**
 * src/screens/VoiceSettingsScreen.tsx
 *
 * Settings screen for the Lior voice/AI subsystem.
 *
 * Currently exposes:
 *   - OpenRouter API key input (paste + save + clear)
 *   - Model selector per role (chat / extract / breakdown)
 *
 * The key is stored in the Zustand store (vita-store), persisted via
 * AsyncStorage. Future iterations will add: TTS voice picker, low-stimulus
 * toggle, persona editor.
 *
 * This screen is a presentational component — no Lior calls are made from
 * here. The key is read by the LiorScreen / pipeline call sites.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useVitaStore } from '../store/vita-store';
import { useTheme } from '../design/ThemeProvider';
import { Icon } from '../design/Icon';
import {
  LIOR_MODELS,
  PROCESSING_DISCLOSURE,
} from '../ai/lior-models';
import { speak, isSpeaking, stop } from '../services/tts';
import { VOICE_PROFILES, getVoiceProfileById } from '../ai/voice-profiles';
import {
  buildBackup,
  shareBackup,
  parseBackupJson,
  importBackup,
} from '../services/backup';

// ─────────────────────────────────────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────────────────────────────────────

export function VoiceSettingsScreen() {
  const { colors, radius, spacing, font, fontSize, lineHeight, motion, mode } = useTheme();
  const apiKey = useVitaStore((s) => s.openRouterApiKey);
  const setApiKey = useVitaStore((s) => s.setOpenRouterApiKey);
  const clearApiKey = useVitaStore((s) => s.clearOpenRouterApiKey);
  const modelSelection = useVitaStore((s) => s.modelSelection);
  const setModelFor = useVitaStore((s) => s.setModelFor);
  const themeMode = useVitaStore((s) => s.themeMode);
  const setThemeMode = useVitaStore((s) => s.setThemeMode);

  const [draftKey, setDraftKey] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);

  // Precompute styles using theme tokens
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    scroll: {
      padding: spacing.md,
      paddingBottom: spacing.lg,
    },
    title: {
      color: colors.text,
      fontSize: fontSize.h1,
      fontWeight: '700',
      marginBottom: spacing.xs,
    },
    subtitle: {
      color: colors.textFaint,
      fontSize: fontSize.monoSm,
      fontFamily: font.mono,
      marginBottom: spacing.xxxl,
    },
    section: {
      marginBottom: spacing.xxxl,
    },
    sectionLabel: {
      color: colors.textDim,
      fontSize: fontSize.bodySm,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: spacing.sm,
    },
    keyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radius.md,
      paddingHorizontal: spacing.sm,
    },
    keyInput: {
      flex: 1,
      color: colors.text,
      fontSize: fontSize.body,
      fontFamily: font.mono,
      paddingVertical: spacing.md,
    },
    eyeButton: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.md,
    },
    eyeButtonText: {
      color: colors.textDim,
      fontSize: fontSize.bodySm,
      fontWeight: '600',
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    statusDot: {
      width: spacing.xs,
      height: spacing.xs,
      borderRadius: spacing.xs / 2,
      backgroundColor: colors.textFaint,
      marginRight: spacing.xs,
    },
    statusDotOn: {
      backgroundColor: colors.success,
    },
    statusText: {
      color: colors.textDim,
      fontSize: fontSize.bodySm,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    button: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonPrimary: {
      backgroundColor: colors.surface,
    },
    buttonPrimaryText: {
      color: colors.text,
      fontWeight: '700',
      fontSize: fontSize.bodySm,
    },
    buttonDanger: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.border,
    },
    buttonDangerText: {
      color: colors.textDim,
      fontWeight: '600',
      fontSize: fontSize.bodySm,
    },
    buttonDisabled: {
      opacity: 0.4,
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radius.md,
      padding: spacing.sm,
      marginBottom: spacing.xs,
    },
    optionRowSelected: {
      borderColor: colors.text,
      backgroundColor: colors.surface2,
    },
    radio: {
      width: spacing.md,
      height: spacing.md,
      borderRadius: spacing.md / 2,
      borderWidth: 2,
      borderColor: colors.border,
      marginRight: spacing.sm,
      marginTop: spacing.xs,
    },
    radioSelected: {
      borderColor: colors.text,
      backgroundColor: colors.text,
    },
    optionBody: {
      flex: 1,
    },
    optionLabel: {
      color: colors.textDim,
      fontSize: fontSize.body,
      fontWeight: '600',
      marginBottom: spacing.xs,
    },
    optionLabelSelected: {
      color: colors.text,
    },
    optionWhy: {
      color: colors.textFaint,
      fontSize: fontSize.mono,
      lineHeight: lineHeight.body,
    },
    hint: {
      color: colors.textFaint,
      fontSize: fontSize.mono,
      lineHeight: 1.6,
      marginTop: spacing.xs,
    },
    genderRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    genderOption: {
      flex: 1,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    genderOptionActive: {
      borderColor: colors.text,
      backgroundColor: colors.surface2,
    },
    genderLabel: {
      color: colors.textDim,
      fontSize: fontSize.body,
      fontWeight: '600',
    },
    genderLabelActive: {
      color: colors.text,
    },
    moodRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginBottom: spacing.md,
    },
    moodOption: {
      flex: 1,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radius.md,
      paddingVertical: spacing.sm,
      alignItems: 'center',
    },
    moodOptionActive: {
      borderColor: colors.text,
      backgroundColor: colors.surface2,
    },
    moodLabel: {
      color: colors.textDim,
      fontSize: fontSize.bodySm,
      fontWeight: '600',
    },
    moodLabelActive: {
      color: colors.text,
    },
    previewButton: {
      backgroundColor: colors.surface2,
      borderColor: colors.text,
      borderWidth: 1,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    previewButtonText: {
      color: colors.text,
      fontSize: fontSize.bodySm,
      fontWeight: '600',
    },
    unlockButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'dashed',
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    unlockButtonText: {
      color: colors.textFaint,
      fontSize: fontSize.bodySm,
      fontStyle: 'italic',
    },
    customPromptInput: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radius.md,
      color: colors.text,
      fontSize: fontSize.body,
      padding: spacing.sm,
      minHeight: spacing.lg,
      textAlignVertical: 'top',
      marginBottom: spacing.sm,
    },
    toggleRow: {
      flexDirection: 'row',
      marginBottom: spacing.sm,
    },
    toggleOption: {
      flex: 1,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.xs,
    },
    toggleOptionActive: {
      borderColor: colors.text,
      backgroundColor: colors.surface2,
    },
    toggleDot: {
      width: spacing.sm,
      height: spacing.sm,
      borderRadius: spacing.sm / 2,
      backgroundColor: colors.textFaint,
    },
    toggleLabel: {
      color: colors.textDim,
      fontSize: fontSize.body,
      fontWeight: '600',
    },
    voiceProfileSection: {
      marginBottom: spacing.md,
    },
    voiceProfileSectionLabel: {
      color: colors.textFaint,
      fontSize: fontSize.monoSm,
      fontFamily: font.mono,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: spacing.xs,
    },
    voiceProfileGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    voiceProfileOption: {
      width: '48%',
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radius.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
    },
    voiceProfileOptionSelected: {
      borderColor: colors.text,
      backgroundColor: colors.surface2,
    },
    voiceProfileCardLabelSelected: {
      color: colors.text,
    },
    voiceProfileName: {
      color: colors.textFaint,
      fontSize: fontSize.monoSm,
      fontFamily: font.mono,
      marginTop: spacing.xs,
    },
    voiceProfileCardLabel: {
      color: colors.textDim,
      fontSize: fontSize.bodySm,
      fontWeight: '600',
    },
    toggleHint: {
      color: colors.textFaint,
      fontSize: fontSize.mono,
      lineHeight: 1.6,
      marginTop: spacing.xs,
    },
    onboardingScroll: {
      flex: 1,
      justifyContent: 'center',
      padding: spacing.lg,
    },
    resetOnboardingBtn: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    resetOnboardingBtnText: {
      color: colors.textFaint,
      fontSize: fontSize.bodySm,
      fontWeight: '600',
    },
    onboardingCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radius.lg,
      padding: spacing.xl,
    },
    onboardingTitle: {
      color: colors.text,
      fontSize: fontSize.h2,
      fontWeight: '700',
      marginBottom: spacing.sm,
    },
    onboardingSubtitle: {
      color: colors.textDim,
      fontSize: fontSize.body,
      lineHeight: 20,
      marginBottom: spacing.lg,
    },
    onboardingPoint: {
      marginBottom: spacing.md,
    },
    onboardingPointTitle: {
      color: colors.text,
      fontSize: fontSize.title,
      fontWeight: '600',
      marginBottom: spacing.xs,
    },
    onboardingPointText: {
      color: colors.textDim,
      fontSize: fontSize.bodySm,
      lineHeight: 18,
    },
    onboardingBtn: {
      backgroundColor: colors.text,
      borderRadius: radius.md,
      paddingVertical: spacing.lg,
      alignItems: 'center',
      marginTop: spacing.xl,
    },
    onboardingBtnText: {
      color: colors.bg,
      fontSize: fontSize.title,
      fontWeight: '700',
    },
  }), [colors, radius, spacing, font, fontSize, lineHeight, motion]);

  const hasKey = apiKey.length > 0;
  const draftChanged = draftKey !== apiKey;

  // ── Persona / voice state ───────────────────────────────────────
  const personaMode = useVitaStore((s) => s.personaMode);
  const setPersonaMode = useVitaStore((s) => s.setPersonaMode);
  const voiceGender = useVitaStore((s) => s.voiceGender);
  const setVoiceGender = useVitaStore((s) => s.setVoiceGender);
  const voiceProfileId = useVitaStore((s) => s.voiceProfileId);
  const setVoiceProfileId = useVitaStore((s) => s.setVoiceProfileId);
  const customPersonaUnlocked = useVitaStore((s) => s.customPersonaUnlocked);
  const unlockCustomPersona = useVitaStore((s) => s.unlockCustomPersona);
  const setCustomPersonaPrompt = useVitaStore((s) => s.setCustomPersonaPrompt);
  const lowStimulus = useVitaStore((s) => s.lowStimulus);
  const setLowStimulus = useVitaStore((s) => s.setLowStimulus);
  const setWasOnboarded = useVitaStore((s) => s.setWasOnboarded);

  const [showPreview, setShowPreview] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');

  // ── Backup & Restore state ─────────────────────────────────────
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [showImport, setShowImport] = useState(false);

  async function handlePreview() {
    await stop();
    const previewText =
      personaMode === 'friendly'
        ? 'Ciao! Sono Lior. Come posso aiutarti oggi?'
        : personaMode === 'seductive'
        ? 'Hey... eccomi qui. Dimmi tutto, ti ascolto con piacere.'
        : 'Bene. Basta chiacchiere. Cosa devi fare oggi?';
    speak(previewText);
  }

  function handleSave() {
    const trimmed = draftKey.trim();
    if (trimmed.length === 0) {
      Alert.alert('Chiave vuota', 'Incolla una chiave OpenRouter valida prima di salvare.');
      return;
    }
    if (!trimmed.startsWith('sk-')) {
      Alert.alert(
        'Formato non valido',
        'Le chiavi OpenRouter iniziano con "sk-". Controlla di aver copiato l\'intera chiave.',
      );
      return;
    }
    setApiKey(trimmed);
    Alert.alert('Salvato', 'Chiave API salvata nel vault locale.');
  }

  function handleClear() {
    Alert.alert(
      'Cancellare la chiave?',
      'Le chiamate a Lior non funzioneranno più finché non ne inserisci una nuova.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Cancella',
          style: 'destructive',
          onPress: () => {
            clearApiKey();
            setDraftKey('');
          },
        },
      ],
    );
  }

  // ── Backup handlers ──────────────────────────────────────────────

  async function handleExport() {
    setIsExporting(true);
    try {
      const backup = buildBackup();
      void backup; // ensure captured before await
      const result = await shareBackup(backup);
      const stats = backup.stats;
      const methodLabel = result.method === 'share' ? 'condiviso' : 'copiato negli appunti';
      Alert.alert(
        'Backup creato',
        `${stats.entries} entry, ${stats.steps} micro-step, ${stats.clusters} cluster.\n\nBackup ${methodLabel} (${formatBytes(result.size)}).`,
      );
    } catch (err) {
      Alert.alert('Errore backup', (err as Error).message);
    } finally {
      setIsExporting(false);
    }
  }

  function handleImportStart() {
    if (importJson.trim().length === 0) {
      Alert.alert('JSON vuoto', 'Incolla il backup JSON qui sotto prima di importare.');
      return;
    }
    const backup: import('../services/backup').VitaBackup = parseBackupJson(importJson);
    Alert.alert(
      'Come importare?',
      `${backup.stats.entries} entry, ${backup.stats.steps} micro-step, ${backup.stats.clusters} cluster.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Unisci',
          onPress: () => doImport(backup, false),
        },
        {
          text: 'Sostituisci tutto',
          style: 'destructive',
          onPress: () => doImport(backup, true),
        },
      ],
    );
  }

  function doImport(backup: ReturnType<typeof parseBackupJson>, replace: boolean) {
    setIsImporting(true);
    try {
      const result = importBackup(backup, { replace });
      const warnings = result.warnings?.length ? `\n\nNote: ${result.warnings.join(' · ')}` : '';
      Alert.alert('Fatto', result.message + warnings);
      setImportJson('');
      setShowImport(false);
    } catch (err) {
      Alert.alert('Errore importazione', (err as Error).message);
    } finally {
      setIsImporting(false);
    }
  }

  function formatBytes(n: number): string {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(2)} MB`;
  }

  function renderModelPicker(role: 'chat' | 'extract' | 'breakdown') {
    const options = LIOR_MODELS.filter((m) => m.role === role);
    const current = modelSelection[role];

    return (
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>
          {role === 'chat' ? 'Modello conversazione' : role === 'extract' ? 'Modello estrazione task' : 'Modello scomposizione micro-step'}
        </Text>
        {options.map((m) => {
          const selected = m.id === current;
          return (
            <TouchableOpacity
              key={m.id}
              style={[styles.optionRow, selected && styles.optionRowSelected]}
              onPress={() => setModelFor(role, m.id)}
            >
              <View style={[styles.radio, selected && styles.radioSelected]} />
              <View style={styles.optionBody}>
                <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                  {m.label}
                </Text>
                <Text style={styles.optionWhy}>{m.why}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* ── Header ──────────────────────────────────────────────── */}
        <Text style={styles.title}>Impostazioni Lior</Text>
        <Text style={styles.subtitle}>{PROCESSING_DISCLOSURE}</Text>

        {/* ── API Key section ─────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Chiave API OpenRouter</Text>

          <View style={styles.keyRow}>
            <TextInput
              style={styles.keyInput}
              value={draftKey}
              onChangeText={setDraftKey}
              placeholder="sk-or-v1-..."
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={!showKey}
              multiline={false}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowKey((v) => !v)}
            >
              <Text style={styles.eyeButtonText}>{showKey ? 'Nascondi' : 'Mostra'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statusRow}>
            <View style={[styles.statusDot, hasKey && styles.statusDotOn]} />
            <Text style={styles.statusText}>
              {hasKey ? 'Chiave configurata' : 'Nessuna chiave — Lior non può rispondere'}
            </Text>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary, !draftChanged && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={!draftChanged}
            >
              <Text style={styles.buttonPrimaryText}>Salva</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonDanger, !hasKey && styles.buttonDisabled]}
              onPress={handleClear}
              disabled={!hasKey}
            >
              <Text style={styles.buttonDangerText}>Cancella</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.hint}>
            La chiave viene salvata solo sul tuo dispositivo. Non lascia mai il telefono
            se non come intestazione Authorization verso OpenRouter.
          </Text>
        </View>

        {/* ── Voice / Persona section ───────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Voce e Personalità</Text>

          {/* Voice profile picker grid: 6 profiles (gender × mood) */}
          <View style={styles.voiceProfileSection}>
            <Text style={styles.voiceProfileSectionLabel}>
              Profilo vocale
            </Text>
            <View style={styles.voiceProfileGrid}>
              {VOICE_PROFILES.map((profile) => {
                const isActive = profile.id === voiceProfileId;
                return (
                  <TouchableOpacity
                    key={profile.id}
                    style={[
                      styles.voiceProfileOption,
                      isActive && styles.voiceProfileOptionSelected,
                    ]}
                    onPress={() => setVoiceProfileId(profile.id)}
                  >
                    <Text style={[
                      styles.voiceProfileCardLabel,
                      isActive && styles.voiceProfileCardLabelSelected,
                    ]}>
                      {profile.label}
                    </Text>
                    <Text style={styles.voiceProfileName}>
                      {profile.voiceName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Gender & Mood as secondary derived controls */}
          <View style={styles.genderRow}>
            <TouchableOpacity
              style={[
                styles.genderOption,
                voiceGender === 'female' && styles.genderOptionActive,
              ]}
              onPress={() => setVoiceGender('female')}
            >
              <Text
                style={[
                  styles.genderLabel,
                  voiceGender === 'female' && styles.genderLabelActive,
                ]}
              >
                Femminile
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.genderOption,
                voiceGender === 'male' && styles.genderOptionActive,
              ]}
              onPress={() => setVoiceGender('male')}
            >
              <Text
                style={[
                  styles.genderLabel,
                  voiceGender === 'male' && styles.genderLabelActive,
                ]}
              >
                Maschile
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.moodRow}>
            {(['friendly', 'seductive', 'mean'] as const).map((moodOption) => (
              <TouchableOpacity
                key={moodOption}
                style={[
                  styles.moodOption,
                  personaMode === moodOption && styles.moodOptionActive,
                ]}
                onPress={() => setPersonaMode(moodOption)}
              >
                <Text
                  style={[
                    styles.moodLabel,
                    personaMode === moodOption && styles.moodLabelActive,
                  ]}
                >
                  {moodOption === 'friendly'
                    ? 'Amichevole'
                    : moodOption === 'seductive'
                    ? 'Seducente'
                    : 'Testardo'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Live preview */}
          <TouchableOpacity
            style={styles.previewButton}
            onPress={handlePreview}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Icon name="Volume2" size={16} color={colors.accentInk} />
              <Text style={styles.previewButtonText}>Ascolta anteprima</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Secret: Custom persona unlock ─────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Personalità personalizzata</Text>
          {customPersonaUnlocked ? (
            <View>
              <TextInput
                style={styles.customPromptInput}
                value={customPrompt}
                onChangeText={setCustomPrompt}
                placeholder="Inserisci il prompt della personalità..."
                placeholderTextColor={colors.textFaint}
                multiline
                textAlignVertical="top"
              />
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.buttonPrimary,
                  customPrompt.length === 0 && styles.buttonDisabled,
                ]}
                onPress={() => {
                  setCustomPersonaPrompt(customPrompt);
                  Alert.alert('Salvato', 'Personalità personalizzata attivata.');
                }}
                disabled={customPrompt.length === 0}
              >
                <Text style={styles.buttonPrimaryText}>Salva personalità</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Pressable
              style={styles.unlockButton}
              onLongPress={unlockCustomPersona}
              delayLongPress={1000}
              pressRetentionOffset={20}
            >
              <Text style={styles.unlockButtonText}>
                Tieni premuto per sbloccare
              </Text>
            </Pressable>
          )}
        </View>

        {/* ── Theme toggle ──────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Tema</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[
                styles.toggleOption,
                themeMode === 'dark' && styles.toggleOptionActive,
              ]}
              onPress={() => setThemeMode('dark')}
            >
              <View style={styles.toggleDot} />
              <Text style={styles.toggleLabel}>Scuro</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleOption,
                themeMode === 'light' && styles.toggleOptionActive,
              ]}
              onPress={() => setThemeMode('light')}
            >
              <View style={styles.toggleDot} />
              <Text style={styles.toggleLabel}>Chiaro</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Low-stimulus toggle ───────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Bassa stimolazione</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[
                styles.toggleOption,
                lowStimulus && styles.toggleOptionActive,
              ]}
              onPress={() => setLowStimulus(!lowStimulus)}
            >
              <View style={styles.toggleDot} />
              <Text style={styles.toggleLabel}>
                {lowStimulus ? 'Attivo' : 'Disattivato'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.toggleHint}>
            Le risposte saranno più brevi, meno variazioni di tono, input
            più scarsi. Utile per situazioni di sovraccarico sensoriale.
          </Text>
        </View>

        {/* ── Model pickers ───────────────────────────────────────── */}
        {renderModelPicker('chat')}
        {renderModelPicker('extract')}
        {renderModelPicker('breakdown')}

        {/* ── Backup & Export ───────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Backup & Esporta</Text>

          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary, isExporting && styles.buttonDisabled]}
            onPress={handleExport}
            disabled={isExporting}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Icon name="ArrowUp" size={16} color={colors.accentInk} />
              <Text style={styles.buttonPrimaryText}>
                {isExporting ? 'Esportazione…' : 'Esporta vault'}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border, marginTop: 12 }]}
            onPress={() => setShowImport(!showImport)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Icon name={showImport ? 'ChevronUp' : 'ArrowDown'} size={16} color={colors.accentInk} />
              <Text style={styles.buttonPrimaryText}>
                {showImport ? 'Chiudi' : 'Importa backup'}
              </Text>
            </View>
          </TouchableOpacity>

          {showImport && (
            <View style={{ marginTop: 16 }}>
              <TextInput
                style={[styles.customPromptInput, { minHeight: 120, fontFamily: 'monospace' }]}
                value={importJson}
                onChangeText={setImportJson}
                placeholder="Incolla qui il backup JSON…"
                placeholderTextColor={colors.textFaint}
                multiline
                textAlignVertical="top"
              />
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.buttonDanger, isImporting && styles.buttonDisabled]}
                  onPress={handleImportStart}
                  disabled={isImporting}
                >
                  <Text style={styles.buttonDangerText}>{isImporting ? '…' : 'Importa'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <Text style={styles.hint}>
            Il backup contiene tutto il vault, i micro-step, i cluster e le impostazioni vocali.
            Puoi salvarlo in un file o condividerlo. L'importazione non sovrascrive mai nulla
            senza che tu lo decida.
          </Text>
        </View>

        {/* ── Footer note ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.hint}>
            Ottieni una chiave gratuita su openrouter.ai. I modelli ":free" hanno
            limiti di rate ma nessun costo.
          </Text>
        </View>

        {/* ── Reset onboarding ─────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Onboarding</Text>
          <TouchableOpacity
            style={styles.resetOnboardingBtn}
            onPress={() => {
              Alert.alert(
                'Riavvia onboarding',
                'L\'onboarding verrà mostrato nuovamente al prossimo avvio.',
                [
                  { text: 'Annulla', style: 'cancel' },
                  {
                    text: 'Riavvia',
                    style: 'destructive',
                    onPress: () => {
                      setWasOnboarded(false);
                      Alert.alert('Fatto', 'Riavvia l\'onboarding al prossimo avvio.');
                    },
                  },
                ],
              );
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Icon name="RotateCcw" size={14} color={colors.textDim} />
            <Text style={styles.resetOnboardingBtnText}>Riavvia onboarding</Text>
          </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

