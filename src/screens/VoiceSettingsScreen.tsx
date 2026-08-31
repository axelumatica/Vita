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

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useVitaStore } from '../store/vita-store';
import {
  LIOR_MODELS,
  PROCESSING_DISCLOSURE,
} from '../ai/lior-models';
import { speak, isSpeaking, stop } from '../services/tts';
import { getVoiceProfileById } from '../ai/voice-profiles';

// ─────────────────────────────────────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────────────────────────────────────

export function VoiceSettingsScreen() {
  const apiKey = useVitaStore((s) => s.openRouterApiKey);
  const setApiKey = useVitaStore((s) => s.setOpenRouterApiKey);
  const clearApiKey = useVitaStore((s) => s.clearOpenRouterApiKey);
  const modelSelection = useVitaStore((s) => s.modelSelection);
  const setModelFor = useVitaStore((s) => s.setModelFor);

  const [draftKey, setDraftKey] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);

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
  const wasOnboarded = useVitaStore((s) => s.wasOnboarded);
  const setWasOnboarded = useVitaStore((s) => s.setWasOnboarded);

  const [showPreview, setShowPreview] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');

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

  if (!wasOnboarded) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.onboardingScroll}>
          <View style={styles.onboardingCard}>
            <Text style={styles.onboardingTitle}>Benvenuto in Vita</Text>
            <Text style={styles.onboardingSubtitle}>
              Lior è il tuo compagno AI per ADHD. Prima di iniziare,
              ecco cosa devi sapere.
            </Text>

            <View style={styles.onboardingPoint}>
              <Text style={styles.onboardingPointTitle}>🎭 Personalità</Text>
              <Text style={styles.onboardingPointText}>
                Lior ha una personalità fissa (non un chatbot generico). Parla italiano,
                estrae solo task con verbi d'azione espliciti, e non diagnostica.
              </Text>
            </View>

            <View style={styles.onboardingPoint}>
              <Text style={styles.onboardingPointTitle}>☁️ Cloud Proxy</Text>
              <Text style={styles.onboardingPointText}>
                L'elaborazione avviene tramite OpenRouter (crittografato). Il badge
                "[Cloud Engine] • [Encrypted Proxy]" è sempre visibile.
              </Text>
            </View>

            <View style={styles.onboardingPoint}>
              <Text style={styles.onboardingPointTitle}>🔐 Privacy</Text>
              <Text style={styles.onboardingPointText}>
                La tua chiave API non lascia mai il dispositivo se non come header
                Authorization verso OpenRouter. Niente log, niente telemetria.
              </Text>
            </View>

            <View style={styles.onboardingPoint}>
              <Text style={styles.onboardingPointTitle}>⚡ Low-Stimulus</Text>
              <Text style={styles.onboardingPointText}>
                Attivabile qui: risposte più brevi, meno variazioni, input più scarsi.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.onboardingBtn}
              onPress={() => setWasOnboarded(true)}
            >
              <Text style={styles.onboardingBtnText}>Capito, inizio</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
              placeholderTextColor="#7c8299"
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

          {/* Gender toggle */}
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

          {/* Mood selector */}
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
            <Text style={styles.previewButtonText}>
              🔊 Ascolta anteprima
            </Text>
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
                placeholderTextColor="#7c8299"
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
            <TouchableOpacity
              style={styles.unlockButton}
              onPress={() => {
                // Secret unlock: hold to activate
                setTimeout(() => unlockCustomPersona(), 500);
              }}
              activeOpacity={0.6}
            >
              <Text style={styles.unlockButtonText}>
                Tieni premuto per sbloccare
              </Text>
            </TouchableOpacity>
          )}
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

        {/* ── Footer note ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.hint}>
            Ottieni una chiave gratuita su openrouter.ai. I modelli ":free" hanno
            limiti di rate ma nessun costo.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B132B', // Night Vault — matches design tokens
  },
  scroll: {
    padding: 20,
    paddingBottom: 60,
  },
  title: {
    color: '#F7F4EA',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: '#7c8299',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 28,
  },
  section: {
    marginBottom: 28,
  },
  sectionLabel: {
    color: '#C5BFB0',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  keyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C2541',
    borderColor: '#2A385B',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  keyInput: {
    flex: 1,
    color: '#F7F4EA',
    fontSize: 14,
    fontFamily: 'monospace',
    paddingVertical: 14,
  },
  eyeButton: {
    paddingHorizontal: 8,
    paddingVertical: 14,
  },
  eyeButtonText: {
    color: '#C5BFB0',
    fontSize: 12,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7c8299',
    marginRight: 8,
  },
  statusDotOn: {
    backgroundColor: '#4ade80',
  },
  statusText: {
    color: '#C5BFB0',
    fontSize: 13,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#F7F4EA',
  },
  buttonPrimaryText: {
    color: '#0B132B',
    fontWeight: '700',
    fontSize: 14,
  },
  buttonDanger: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2A385B',
  },
  buttonDangerText: {
    color: '#C5BFB0',
    fontWeight: '600',
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1C2541',
    borderColor: '#2A385B',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  optionRowSelected: {
    borderColor: '#F7F4EA',
    backgroundColor: '#161d38',
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#2A385B',
    marginRight: 12,
    marginTop: 2,
  },
  radioSelected: {
    borderColor: '#F7F4EA',
    backgroundColor: '#F7F4EA',
  },
  optionBody: {
    flex: 1,
  },
  optionLabel: {
    color: '#C5BFB0',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionLabelSelected: {
    color: '#F7F4EA',
  },
  optionWhy: {
    color: '#7c8299',
    fontSize: 12,
    lineHeight: 1.5,
  },
  hint: {
    color: '#7c8299',
    fontSize: 12,
    lineHeight: 1.6,
    marginTop: 8,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  genderOption: {
    flex: 1,
    backgroundColor: '#1C2541',
    borderColor: '#2A385B',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  genderOptionActive: {
    borderColor: '#F7F4EA',
    backgroundColor: '#161d38',
  },
  genderLabel: {
    color: '#C5BFB0',
    fontSize: 14,
    fontWeight: '600',
  },
  genderLabelActive: {
    color: '#F7F4EA',
  },
  moodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  moodOption: {
    flex: 1,
    backgroundColor: '#1C2541',
    borderColor: '#2A385B',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  moodOptionActive: {
    borderColor: '#F7F4EA',
    backgroundColor: '#161d38',
  },
  moodLabel: {
    color: '#C5BFB0',
    fontSize: 13,
    fontWeight: '600',
  },
  moodLabelActive: {
    color: '#F7F4EA',
  },
  previewButton: {
    backgroundColor: '#161d38',
    borderColor: '#F7F4EA',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  previewButtonText: {
    color: '#F7F4EA',
    fontSize: 14,
    fontWeight: '600',
  },
  unlockButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2A385B',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  unlockButtonText: {
    color: '#7c8299',
    fontSize: 12,
    fontStyle: 'italic',
  },
  customPromptInput: {
    backgroundColor: '#1C2541',
    borderColor: '#2A385B',
    borderWidth: 1,
    borderRadius: 12,
    color: '#F7F4EA',
    fontSize: 14,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  toggleOption: {
    flex: 1,
    backgroundColor: '#1C2541',
    borderColor: '#2A385B',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  toggleOptionActive: {
    borderColor: '#F7F4EA',
    backgroundColor: '#161d38',
  },
  toggleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#7c8299',
  },
  toggleLabel: {
    color: '#C5BFB0',
    fontSize: 14,
    fontWeight: '600',
  },
  toggleHint: {
    color: '#7c8299',
    fontSize: 12,
    lineHeight: 1.6,
    marginTop: 8,
  },
  // ── Onboarding ──────────────────────────────────────────────────────
  onboardingScroll: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  onboardingCard: {
    backgroundColor: '#1C2541',
    borderColor: '#2A385B',
    borderWidth: 1,
    borderRadius: 20,
    padding: 28,
  },
  onboardingTitle: {
    color: '#F7F4EA',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  onboardingSubtitle: {
    color: '#7c8299',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  onboardingPoint: {
    marginBottom: 18,
  },
  onboardingPointTitle: {
    color: '#F7F4EA',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  onboardingPointText: {
    color: '#C5BFB0',
    fontSize: 13,
    lineHeight: 18,
  },
  onboardingBtn: {
    backgroundColor: '#F7F4EA',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  onboardingBtnText: {
    color: '#0B132B',
    fontSize: 16,
    fontWeight: '700',
  },
});
