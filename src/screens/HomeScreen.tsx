/**
 * src/screens/HomeScreen.tsx
 *
 * Dashboard landing screen. Placeholder — full dashboard to be built later.
 * Shows the Focus card, recent entries, and a quick-capture bar.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useVitaStore } from '../store/vita-store';
import { useTheme } from '../design/ThemeProvider';
import type { RootStackParamList } from '../navigation/NavigationRoot';

/** Wrap StyleSheet.create so styles re-read colors when theme changes. */
function useThemedStyles() {
  const { colors, radius } = useTheme();
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 16, paddingBottom: 100 },
    heroCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: 20,
      marginBottom: 16,
    },
    heroEyebrow: {
      color: colors.textFaint,
      fontSize: 11,
      fontFamily: 'monospace',
      letterSpacing: 0.8,
      marginBottom: 8,
    },
    heroText: { color: colors.text, fontSize: 16, lineHeight: 24 },
    quickActions: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 16,
    },
    quickBtn: {
      flex: 1,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingVertical: 14,
      alignItems: 'center',
    },
    quickBtnText: { color: colors.textDim, fontSize: 13, fontWeight: '600' },
    statusCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: 16,
      marginBottom: 16,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.textFaint,
      marginRight: 8,
    },
    statusDotOn: {
      backgroundColor: colors.success,
    },
    statusText: { color: colors.textDim, fontSize: 13 },
    settingsLink: {
      alignSelf: 'flex-start',
    },
    settingsLinkText: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: '600',
    },
    recentCard: { marginTop: 8 },
    sectionLabel: {
      color: colors.textFaint,
      fontSize: 10,
      fontFamily: 'monospace',
      letterSpacing: 0.8,
      marginBottom: 10,
    },
    recentItem: {
      backgroundColor: colors.surface2,
      borderRadius: 10,
      padding: 12,
      marginBottom: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    recentText: { color: colors.textDim, fontSize: 13 },
  });
}

export function HomeScreen() {
  const s = useThemedStyles();
  const nav = useNavigation<CompositeNavigationProp<
    BottomTabNavigationProp<Record<string, undefined>>,
    NativeStackNavigationProp<RootStackParamList>
  >>();
  const vaultEntries = useVitaStore((s) => s.vaultEntries);
  const focusTaskId = useVitaStore((s) => s.focusTaskId);
  const apiKey = useVitaStore((s) => s.openRouterApiKey);

  const focusTask = vaultEntries.find((e) => e.id === focusTaskId);
  const recent = vaultEntries.filter((e) => !e.isArchived).slice(0, 3);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* Hero card */}
      <View style={s.heroCard}>
        <Text style={s.heroEyebrow}>🎯 FOCUS UNICO</Text>
        <Text style={s.heroText}>
          {focusTask
            ? `Focus: "${focusTask.title}"`
            : 'Nessun task in focus.\nParla con Lior per iniziare.'}
        </Text>
      </View>

      {/* Quick actions */}
      <View style={s.quickActions}>
        <TouchableOpacity
          style={s.quickBtn}
          onPress={() => nav.navigate('LiorTab')}
        >
          <Text style={s.quickBtnText}>🎙 Voce</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.quickBtn}
          onPress={() => nav.navigate('TasksTab')}
        >
          <Text style={s.quickBtnText}>⚡ Task</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.quickBtn}
          onPress={() => nav.navigate('DiaryTab')}
        >
          <Text style={s.quickBtnText}>📖 Diario</Text>
        </TouchableOpacity>
      </View>

      {/* System status */}
      <View style={s.statusCard}>
        <View style={s.statusRow}>
          <View style={[s.statusDot, apiKey ? s.statusDotOn : undefined]} />
          <Text style={s.statusText}>
            {apiKey ? 'Cloud Engine configurato' : 'Cloud Engine non configurato'}
          </Text>
        </View>
        <TouchableOpacity
          style={s.settingsLink}
          onPress={() => nav.navigate('Settings')}
        >
          <Text style={s.settingsLinkText}>Apri Impostazioni ↑</Text>
        </TouchableOpacity>
      </View>

      {/* Recent entries */}
      {vaultEntries.filter((e) => !e.isArchived).length > 0 && (
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
  );
}