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
});
