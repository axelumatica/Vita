import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Switch } from 'react-native';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../design/ThemeProvider';
import { useStore } from '../store/vita-store';
import { LIOR_MODELS, DEFAULT_LIOR_MODEL } from '../ai/lior-models';

type VoiceOption = {
  id: string;
  name: string;
  quality: string;
};

// Best free offline voices (no ElevenLabs required).
// expo-speech uses system TTS — free, works offline.
// For higher quality (still free): use edge-tts voices or Coqui TTS locally.
const FREE_VOICES: VoiceOption[] = [
  { id: 'com.apple.tts.en-US.Samantha', name: 'Samantha (iOS)', quality: 'Standard' },
  { id: 'com.apple.tts.en-US.Allison', name: 'Allison (Neural)', quality: 'Premium' },
  { id: 'com.google.android.tts', name: 'Google TTS (Android)', quality: 'Standard' },
];

export function VoiceSettingsScreen({ onClose }: { onClose?: () => void }) {
  const { colors, radius, spacing, font, fontSize } = useTheme();
  const { liorVoice, setLiorVoice, liorModel, setLiorModel, lowStimulus, toggleLowStimulus } = useStore();
  const [availableVoices, setAvailableVoices] = useState<VoiceOption[]>(FREE_VOICES);
  const [showVoices, setShowVoices] = useState(false);

  // Load available voices
  useEffect(() => {
    Speech.getAvailableVoicesAsync()
      .then((voices: Speech.Voice[]) => {
        const mapped: VoiceOption[] = voices.map((v) => ({
          id: v.identifier,
          name: v.name || v.language,
          quality: v.quality === Speech.VoiceQuality.Enhanced ? 'Premium' : 'Standard',
        }));
        // Merge system voices with our defaults
        const merged = [...mapped.filter(v => v.id.startsWith('com.apple') || v.id.startsWith('com.google')), ...FREE_VOICES];
        setAvailableVoices(merged);
      })
      .catch(() => {
        // Keep defaults
      });
  }, []);

  const handleVoiceSelect = (voiceId: string) => {
    setLiorVoice(voiceId);
  };

  const handleModelSelect = (model: string) => {
    setLiorModel(model);
  };

  const testVoice = async () => {
    if (liorVoice) {
      await Speech.speak("Ciao sono Lior. Sono pronto ad ascoltarti.", {
        voice: liorVoice,
        language: 'it-IT',
      });
    } else {
      await Speech.speak("Ciao sono Lior. Sono pronto ad ascoltarti.", { language: 'it-IT' });
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} showsVerticalScrollIndicator={false}>
      <View style={[styles.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onClose}>
          <Text style={{ color: colors.textFaint, fontFamily: font.mono, fontSize: fontSize.monoSm }}>✕</Text>
        </TouchableOpacity>
        <Text style={{ color: colors.text, fontFamily: font.display, fontSize: fontSize.h2, fontWeight: '600' }}>Impostazioni Voce</Text>
      </View>

      {/* Voice Provider Selector */}
      <View style={[styles.section, { marginTop: spacing.md, marginHorizontal: 16 }]}>
        <Text style={[styles.sectionTitle, { color: colors.textFaint, fontFamily: font.mono, fontSize: 10, letterSpacing: 0.12, textTransform: 'uppercase' }]}>
          MOTORE VOCE
        </Text>
        <Text style={{ color: colors.text, fontFamily: font.body, fontSize: fontSize.body, lineHeight: 1.55, marginTop: 4 }}>
          Vita usa la sintesi vocale del sistema (gratis, offline). Scegli la qualità della voce di Lior:
        </Text>

        <TouchableOpacity
          style={[styles.voiceSelector, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, marginTop: 12, padding: 14, borderWidth: 1 }]}
          onPress={() => setShowVoices(!showVoices)}
        >
          <Text style={{ color: colors.text, fontFamily: font.display, fontSize: fontSize.bodySm }}>
            {availableVoices.find(v => v.id === liorVoice)?.name || 'Samantha (default)'}
          </Text>
          <Text style={{ color: colors.textFaint, fontFamily: font.mono, fontSize: fontSize.monoSm }}>{showVoices ? '▴' : '▾'}</Text>
        </TouchableOpacity>

        {showVoices && (
          <View style={{ marginTop: 8, gap: 6 }}>
            {availableVoices.map((voice) => (
              <TouchableOpacity
                key={voice.id}
                style={[styles.voiceOption, { backgroundColor: liorVoice === voice.id ? colors.accent : colors.surface2, borderColor: colors.border, borderRadius: radius.sm, padding: 10, borderWidth: liorVoice === voice.id ? 0 : 1 }]}
                onPress={() => { handleVoiceSelect(voice.id); setShowVoices(false); }}
              >
                <Text style={{ color: liorVoice === voice.id ? colors.accentInk : colors.text, fontFamily: font.display, fontSize: fontSize.bodySm }}>
                  {voice.name}
                </Text>
                <Text style={{ color: liorVoice === voice.id ? colors.accentInk : colors.textDim, fontFamily: font.mono, fontSize: fontSize.monoSm, marginTop: 2 }}>
                  {voice.quality} · Offline
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Lior Personality Model Selector */}
      <View style={[styles.section, { marginTop: spacing.lg, marginHorizontal: 16 }]}>
        <Text style={[styles.sectionTitle, { color: colors.textFaint, fontFamily: font.mono, fontSize: 10, letterSpacing: 0.12, textTransform: 'uppercase' }]}>
          CERVELlo DIORIO — OPENROUTER (GRATIS)
        </Text>
        <Text style={{ color: colors.text, fontFamily: font.body, fontSize: fontSize.body, lineHeight: 1.55, marginTop: 4 }}>
          Tutti i modelli sono gratuiti (free tier). Il modello predefinito è Gemini 2 Flash — veloce e naturale.
        </Text>

        <View style={{ marginTop: 12, gap: 8 }}>
          {LIOR_MODELS.map((model) => (
            <TouchableOpacity
              key={model.id}
              style={[styles.modelOption, { backgroundColor: liorModel === model.id ? colors.accent : colors.surface2, borderColor: colors.border, borderRadius: radius.md, padding: 12, borderWidth: liorModel === model.id ? 0 : 1 }]}
              onPress={() => handleModelSelect(model.id)}
            >
              <Text style={{ color: liorModel === model.id ? colors.accentInk : colors.text, fontFamily: font.display, fontSize: fontSize.bodySm, fontWeight: '600' }}>
                {model.name}
              </Text>
              <Text style={{ color: liorModel === model.id ? colors.accentInk : colors.textDim, fontFamily: font.mono, fontSize: fontSize.monoSm, marginTop: 2 }}>
                {model.bestFor}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Low-Stimulus Mode */}
      <View style={[styles.section, { marginTop: spacing.lg, marginHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.textFaint, fontFamily: font.mono, fontSize: 10, letterSpacing: 0.12, textTransform: 'uppercase' }]}>
            MODALITÀ BASSA STIMOLAZIONE
          </Text>
          <Text style={{ color: colors.textDim, fontFamily: font.body, fontSize: fontSize.bodySm, lineHeight: 1.55, marginTop: 2 }}>
            Disattiva animazioni e decorazioni
          </Text>
        </View>
        <Switch
          value={lowStimulus}
          onValueChange={toggleLowStimulus}
          trackColor={{ false: colors.surface2, true: colors.accent }}
          thumbColor={lowStimulus ? colors.accentInk : colors.textFaint}
        />
      </View>

      {/* Test voice button */}
      <View style={{ marginHorizontal: 16, marginTop: spacing.lg, marginBottom: 40 }}>
        <TouchableOpacity
          style={[styles.testBtn, { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' }]}
          onPress={testVoice}
        >
          <Text style={{ color: colors.accentInk, fontFamily: font.display, fontSize: fontSize.body, fontWeight: '600' }}>▶️ Ascolta Lior</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  section: {},
  sectionTitle: {},
  voiceSelector: { borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  voiceOption: {},
  modelOption: {},
  testBtn: {},
});