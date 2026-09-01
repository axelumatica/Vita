/**
 * src/screens/OnboardingScreen.tsx
 * Full-screen onboarding flow shown at first launch.
 * Takes over the navigator until the user taps "Inizia".
 * On complete, sets wasOnboarded=true and navigates to MainTabs.
 * Can also be re-shown from Settings (reset wasOnboarded).
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useVitaStore } from '../store/vita-store';
import { useTheme } from '../design/ThemeProvider';

const TOTAL_STEPS = 4;

function useThemedStyles() {
  const { colors, radius } = useTheme();
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 24, paddingBottom: 100 },
    introCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: 24,
      marginBottom: 24,
    },
    introTitle: { color: colors.text, fontSize: 28, fontWeight: '700', marginBottom: 8 },
    introSubtitle: { color: colors.textDim, fontSize: 14, lineHeight: 20 },
    stepIndicator: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surface2,
      borderWidth: 2,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 8,
    },
    stepIndicatorActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    stepIndicatorText: { color: colors.text, fontSize: 11, fontWeight: '600' },
    stepIndicatorTextActive: { color: colors.accentInk, fontSize: 11, fontWeight: '600' },
    skipBtn: {
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    skipBtnText: { color: colors.textFaint, fontSize: 12, fontWeight: '600' },
    doneBtn: {
      backgroundColor: colors.accent,
      borderRadius: radius.md,
      paddingVertical: 16,
      paddingHorizontal: 24,
      alignItems: 'center',
      marginTop: 24,
    },
    doneBtnText: { color: colors.accentInk, fontSize: 16, fontWeight: '700' },
    doneBtnSecondary: {
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingVertical: 16,
      paddingHorizontal: 24,
      alignItems: 'center',
      marginTop: 24,
    },
    doneBtnSecondaryText: { color: colors.textDim, fontSize: 16, fontWeight: '600' },
    dotsRow: { flexDirection: 'row', marginBottom: 24, gap: 6 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
    dotActive: { backgroundColor: colors.accent },
    progressBar: { height: 3, borderRadius: 1.5, backgroundColor: colors.surface2, marginBottom: 24 },
    progressFill: { height: 3, borderRadius: 1.5, backgroundColor: colors.accent },
  });
}

export function OnboardingScreen() {
  const s = useThemedStyles();
  const navigation = useNavigation<any>();
  const wasOnboarded = useVitaStore((s) => s.wasOnboarded);
  const setWasOnboarded = useVitaStore((s) => s.setWasOnboarded);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const goTo = useCallback((step: number) => {
    if (step >= 0 && step < TOTAL_STEPS) setCurrentStep(step);
  }, []);

  const handleSkip = useCallback(() => {
    Alert.alert(
      'Saltare l\'onboarding',
      'L\'onboarding può essere ripreso dalle Impostazioni in qualsiasi momento.',
      [
        { text: 'Ok', style: 'cancel' },
      ]
    );
  }, []);

  const handleDone = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await setWasOnboarded(true);
      navigation.replace('MainTabs');
    } catch {
      Alert.alert('Errore', 'Non sono stato in grado di salvare la scelta.');
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, setWasOnboarded, navigation]);

  // Step contents
  const steps = [
    {
      title: 'Benvenuto in Vita',
      body:
        'Vita è il tuo compagno AI per l\'ADHD. Aiuta a catturare pensieri, estrarre task e mantenere un vault personale. Tutto è locale, crittografato e gestito dalla tua chiave OpenRouter.',
    },
    {
      title: 'Lior — La tua presenza AI',
      body:
        'Lior non è un chatbot generico. Ha una personalità fissa (italiano), estrae solo task con verbi d\'azione espliciti ("devo", "farò", "ricordami"), e non diagnostica nulla. Risponde tramite OpenRouter (cloud proxy, header-only).',
    },
    {
      title: '🔐 Privacy e Sicurezza',
      body:
        'La tua chiave API non lascia mai il dispositivo se non come header Authorization verso OpenRouter. Non c\'è telemetria, nessun log. Le risposte sono crittografate e transitano solo tra il telefono e OpenRouter.',
    },
    {
      title: '⚡ Impostazioni rapide',
      body:
        'Puoi scegliere la voce di Lior (6 profili vocali italiani), attivare la bassa stimolazione per risposte più brevi, e selezionare i modelli per chat/estrazione/scomposizione. Tutto configurabile da Impostazioni.',
    },
  ];

  const step = steps[currentStep];

  return (
    <ScrollView
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Progress dots + horizontal bar */}
      <View style={s.dotsRow}>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <View
            key={i}
            style={[
              s.dot,
              currentStep >= i && s.dotActive,
            ]}
          />
        ))}
        <View style={s.progressBar}>
          <View style={{ width: ((currentStep + 1) / TOTAL_STEPS) * 100, ...s.progressFill }} />
        </View>
      </View>

      {/* Step content */}
      <View style={s.introCard}>
        <Text style={s.introTitle}>{step.title}</Text>
        <Text style={s.introSubtitle}>{step.body}</Text>
      </View>

      {/* Navigation buttons */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24 }}>
        {currentStep > 0 ? (
          <TouchableOpacity style={s.doneBtnSecondary} onPress={() => goTo(currentStep - 1)}>
            <Text style={s.doneBtnSecondaryText}>Indietro</Text>
          </TouchableOpacity>
        ) : null}
        {currentStep < TOTAL_STEPS - 1 ? (
          <TouchableOpacity style={s.doneBtnSecondary} onPress={() => goTo(currentStep + 1)}>
            <Text style={s.doneBtnSecondaryText}>Avanti</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={s.doneBtn} onPress={handleDone}>
            <Text style={s.doneBtnText}>Inizia</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}