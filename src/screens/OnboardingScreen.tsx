/**
 * src/screens/OnboardingScreen.tsx
 *
 * ADHD-tuned onboarding: visual-first, feature-focused, low-cognitive-load.
 * 4 screens, each showing what the user actually gets:
 *   1. Quick capture - tap +, say or type
 *   2. Lior companion - talk to your ADHD coach
 *   3. Micro-actions - tasks broken to <=2 min steps
 *   4. Your vault - everything saved locally, always yours
 *
 * Principles: no shame, skip anytime, no streaks, visual over text.
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
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: 24,
      marginBottom: 32,
    },
    iconWrap: {
      width: 80,
      height: 80,
      borderRadius: 20,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    title: {
      color: colors.text,
      fontSize: 22,
      fontWeight: '700',
      marginBottom: 8,
      textAlign: 'center',
    },
    body: {
      color: colors.textDim,
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center',
    },
    dotsRow: { flexDirection: 'row', marginBottom: 24, gap: 8 },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.border,
    },
    dotActive: { backgroundColor: colors.accent },
    navRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
    btnSecondary: {
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    btnSecondaryText: { color: colors.textDim, fontSize: 14, fontWeight: '600' },
    btnPrimary: {
      backgroundColor: colors.accent,
      borderRadius: radius.md,
      paddingVertical: 14,
      paddingHorizontal: 24,
    },
    btnPrimaryText: { color: colors.accentInk, fontSize: 16, fontWeight: '700' },
    skipBtn: {
      alignSelf: 'flex-end',
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    skipBtnText: { color: colors.textFaint, fontSize: 12, fontWeight: '600' },
  });
}

export function OnboardingScreen() {
  const s = useThemedStyles();
  const navigation = useNavigation<any>();
  const setWasOnboarded = useVitaStore((s) => s.setWasOnboarded);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const goTo = useCallback((step: number) => {
    if (step >= 0 && step < TOTAL_STEPS) setCurrentStep(step);
  }, []);

  const handleSkip = useCallback(() => {
    Alert.alert(
      'Saltare l\'onboarding?',
      'Puoi riprenderlo da Impostazioni in qualsiasi momento.',
      [{ text: 'Continua', style: 'cancel' }],
    );
  }, []);

  const handleDone = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await setWasOnboarded(true);
      navigation.replace('MainTabs');
    } catch {
      Alert.alert('Errore', 'Non e stato possibile salvare l\'avvio.');
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, setWasOnboarded, navigation]);

  const steps = [
    {
      iconName: 'capture',
      title: 'Cattura istantaneamente',
      body: 'Tocca qui sotto, premi il microfono o scrivi. Lior ti aiuta a mettere ordine senza giudizio.',
    },
    {
      iconName: 'lior',
      title: 'Lior - il tuo compagno ADHD',
      body: 'Parla con lui. Scrive spunti. Estrae task solo se usi verbi espliciti ("devo", "faro", "ricordami").',
    },
    {
      iconName: 'breakdown',
      title: 'Micro-steps fattibili',
      body: 'Ogni task diventa piccoli passi da <=2 minuti. Niente paralisi da "dove inizio".',
    },
    {
      iconName: 'vault',
      title: 'Il tuo vault locale',
      body: 'Tutto salva. Niente nuvola. Niente perdita. Mai spostato, mai condiviso.',
    },
  ];

  const renderIcon = (name: string) => {
    const icons: Record<string, string> = {
      capture: '➕',
      lior: '🔮',
      breakdown: '📋',
      vault: '🔒',
    };
    return icons[name] ?? '✨';
  };

  const step = steps[currentStep];

  return (
    <ScrollView
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity style={s.skipBtn} onPress={handleSkip}>
        <Text style={s.skipBtnText}>Salta</Text>
      </TouchableOpacity>

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
      </View>

      <View style={s.card}>
        <View style={s.iconWrap}>
          <Text style={{ fontSize: 32 }}>{renderIcon(step.iconName)}</Text>
        </View>
        <Text style={s.title}>{step.title}</Text>
        <Text style={s.body}>{step.body}</Text>
      </View>

      <View style={s.navRow}>
        {currentStep > 0 ? (
          <TouchableOpacity style={s.btnSecondary} onPress={() => goTo(currentStep - 1)}>
            <Text style={s.btnSecondaryText}>Indietro</Text>
          </TouchableOpacity>
        ) : null}
        {currentStep < TOTAL_STEPS - 1 ? (
          <TouchableOpacity style={s.btnSecondary} onPress={() => goTo(currentStep + 1)}>
            <Text style={s.btnSecondaryText}>Avanti</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={s.btnPrimary} onPress={handleDone}>
            <Text style={s.btnPrimaryText}>Inizia</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}
