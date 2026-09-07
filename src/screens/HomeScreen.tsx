/**
 * src/screens/HomeScreen.tsx
 *
 * Dashboard landing screen with time-of-day context and "wins this week" counter.
 * ADHD-friendly: no shame, no streaks, just a gentle progress indicator.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useVitaStore } from '../store/vita-store';
import { useTheme } from '../design/ThemeProvider';
import { Fonts } from '../design/tokens';
import { Icon } from '../design/Icon';
import { EmergencyOverlay } from '../components/EmergencyOverlay';
import type { RootStackParamList } from '../navigation/NavigationRoot';

function timeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  if (h < 21) return 'evening';
  return 'night';
}

const TOD_GREETING: Record<string, string> = {
  morning: 'Buongiorno ☀️',
  afternoon: 'Buon pomeriggio 🌤',
  evening: 'Buonasera 🌙',
  night: 'Bulla notte 🌌',
};

const TOD_HINT: Record<string, string> = {
  morning: 'Oggi è un nuovo giorno. Un passo alla volta.',
  afternoon: 'Come procede la giornata?',
  evening: 'Giornata finita. Cosa hai fatto di bene?',
  night: 'Piccola vittoria prima di dormire.',
};

/** Wrap StyleSheet.create so styles re-read colors when theme changes. */
function useThemedStyles() {
  const { colors, radius } = useTheme();
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { paddingHorizontal: 20, paddingBottom: 100, paddingTop: 8 },
    /* Top bar — single settings button, no status */
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingHorizontal: 4,
      marginBottom: 8,
    },
    settingsBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    /* Hero card — focus + organic CTA */
    heroCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: 24,
      marginBottom: 16,
    },
    heroEyebrow: {
      color: colors.textFaint,
      fontSize: 11,
      fontFamily: Fonts.mono,
      letterSpacing: 0.8,
      marginBottom: 8,
    },
    heroTitle: { color: colors.text, fontSize: 22, fontWeight: '700', marginBottom: 6 },
    heroSubtitle: { color: colors.textDim, fontSize: 15, lineHeight: 22 },
    /* Organic CTA card */
    ctaCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: 20,
      marginBottom: 16,
    },
    ctaText: { color: colors.text, fontSize: 16, lineHeight: 24 },
    ctaButton: {
      marginTop: 16,
      paddingHorizontal: 20,
      paddingVertical: 14,
      backgroundColor: colors.accent,
      borderRadius: radius.md,
      alignItems: 'center',
    },
    ctaButtonText: { color: colors.accentInk, fontSize: 15, fontWeight: '600' },
    /* Focus task card (only shown if exists) */
    focusCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: radius.lg,
      padding: 20,
      marginBottom: 16,
    },
    focusEyebrow: {
      color: colors.accent,
      fontSize: 10,
      fontFamily: Fonts.mono,
      letterSpacing: 0.8,
      marginBottom: 8,
    },
    focusTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 8 },
    focusStep: { color: colors.textDim, fontSize: 14, lineHeight: 21 },
    focusActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 16,
    },
    focusBtn: {
      flex: 1,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: 'center',
    },
    focusBtnText: { color: colors.textDim, fontSize: 13, fontWeight: '600' },
    focusBtnPrimary: { backgroundColor: colors.accent },
    focusBtnPrimaryText: { color: colors.accentInk },
    /* Quick actions row */
    quickActions: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 20,
    },
    quickBtn: {
      flex: 1,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingVertical: 16,
      paddingHorizontal: 16,
      alignItems: 'center',
    },
    quickBtnText: { color: colors.textDim, fontSize: 13, fontWeight: '600' },
    /* Recent entries */
    recentCard: { marginTop: 8 },
    sectionLabel: {
      color: colors.textFaint,
      fontSize: 10,
      fontFamily: Fonts.mono,
      letterSpacing: 0.8,
      marginBottom: 10,
    },
    recentItem: {
      backgroundColor: colors.surface2,
      borderRadius: radius.md,
      padding: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    recentText: { color: colors.textDim, fontSize: 14, lineHeight: 21 },
  });
}

export function HomeScreen() {
  const { colors } = useTheme();
  const s = useThemedStyles();
  const nav = useNavigation<CompositeNavigationProp<
    BottomTabNavigationProp<Record<string, undefined>>,
    NativeStackNavigationProp<RootStackParamList>
  >>();
  const vaultEntries = useVitaStore((s) => s.vaultEntries);
  const focusTaskId = useVitaStore((s) => s.focusTaskId);
  const emergencyMode = useVitaStore((s) => s.emergencyMode);

  const focusTask = vaultEntries.find((e) => e.id === focusTaskId);
  const recent = vaultEntries.filter((e) => !e.isArchived).slice(0, 3);
  const hasEntries = vaultEntries.filter((e) => !e.isArchived).length > 0;

  const tod = timeOfDay();

  return (
    <>
      <ScrollView style={s.container} contentContainerStyle={s.content}>
        {/* Top bar — single settings button, no status indicator */}
        <View style={s.topBar}>
          <TouchableOpacity
            accessibilityLabel="Impostazioni"
            accessibilityRole="button"
            style={s.settingsBtn}
            onPress={() => nav.navigate('Settings')}
          >
            <Icon name="Settings" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Focus card — only when there's a focus task */}
        {focusTask && (
          <View style={s.focusCard}>
            <Text style={s.focusEyebrow}>🎯 FOCUS</Text>
            <Text style={s.focusTitle}>{focusTask.title}</Text>
            <Text style={s.focusStep}>
              Una micro-azione alla volta. Sceglila qui sotto.
            </Text>
            <View style={s.focusActions}>
              <TouchableOpacity style={s.focusBtn} accessibilityLabel="Riduci ulteriormente" accessibilityRole="button">
                <Text style={s.focusBtnText}>Riduci</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.focusBtn} accessibilityLabel="Dammi 2 minuti" accessibilityRole="button">
                <Text style={s.focusBtnText}>2 min</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.focusBtn, s.focusBtnPrimary]}
                accessibilityLabel="Segna come fatto"
                accessibilityRole="button"
              >
                <Text style={[s.focusBtnText, s.focusBtnPrimaryText]}>Fatto</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Organic CTA — question instead of "Ioredi" status */}
        {!focusTask && (
          <View style={s.ctaCard}>
            <Text style={s.ctaText}>
              {hasEntries
                ? 'Cosa vuoi catturare adesso?'
                : 'Qual è la prima cosa che ti passa per la testa?'}
            </Text>
            <TouchableOpacity
              style={s.ctaButton}
              accessibilityLabel="Inizia a parlare con Lior"
              accessibilityRole="button"
              onPress={() => nav.navigate('LiorTab')}
            >
              <Text style={s.ctaButtonText}>Parla con Lior</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick navigation */}
        <View style={s.quickActions}>
          <TouchableOpacity
            style={s.quickBtn}
            accessibilityLabel="Apri Diario"
            accessibilityRole="button"
            onPress={() => nav.navigate('DiaryTab')}
          >
            <Text style={s.quickBtnText}>Diario</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.quickBtn}
            accessibilityLabel="Apri Tasks"
            accessibilityRole="button"
            onPress={() => nav.navigate('TasksTab')}
          >
            <Text style={s.quickBtnText}>Tasks</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.quickBtn}
            accessibilityLabel="Apri Vault"
            accessibilityRole="button"
            onPress={() => nav.navigate('VaultTab')}
          >
            <Text style={s.quickBtnText}>Vault</Text>
          </TouchableOpacity>
        </View>

        {/* Recent entries */}
        {hasEntries && (
          <View style={s.recentCard}>
            <Text style={s.sectionLabel}>RECENTI</Text>
            {recent.map((entry) => (
              <View key={entry.id} style={s.recentItem}>
                <Text style={s.recentText} numberOfLines={2}>
                  {entry.content || entry.title}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      <EmergencyOverlay visible={emergencyMode} />
    </>
  );
}
