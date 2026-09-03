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
import { Icon } from '../design/Icon';
import { useLowStimulusEmphasis, useLowStimulusMotion } from '../design/lowStimulus';
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
    greeting: { color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: 4 },
    hint: { color: colors.textDim, fontSize: 14, lineHeight: 20 },
    /* Wins bar */
    winsBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginBottom: 16,
    },
    winsEmoji: { fontSize: 20, marginRight: 8 },
    winsLabel: { color: colors.textDim, fontSize: 13, fontWeight: '600' },
    winsCount: { color: colors.accent, fontSize: 18, fontWeight: '700', marginLeft: 4 },
    winsSub: { color: colors.textFaint, fontSize: 11, marginLeft: 4 },
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
    statusDotOn: { backgroundColor: colors.success },
    statusText: { color: colors.textDim, fontSize: 13 },
    settingsLink: { alignSelf: 'flex-start' },
    settingsLinkText: { color: colors.accent, fontSize: 13, fontWeight: '600' },
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
  const { colors } = useTheme();
  const s = useThemedStyles();
  const emphasis = useLowStimulusEmphasis();
  const motion = useLowStimulusMotion();
  const nav = useNavigation<CompositeNavigationProp<
    BottomTabNavigationProp<Record<string, undefined>>,
    NativeStackNavigationProp<RootStackParamList>
  >>();
  const vaultEntries = useVitaStore((s) => s.vaultEntries);
  const focusTaskId = useVitaStore((s) => s.focusTaskId);
  const apiKey = useVitaStore((s) => s.openRouterApiKey);
  const winsLog = useVitaStore((s) => s.winsLog);
  const recordWin = useVitaStore((s) => s.recordWin);
  const emergencyMode = useVitaStore((s) => s.emergencyMode);

  const focusTask = vaultEntries.find((e) => e.id === focusTaskId);
  const recent = vaultEntries.filter((e) => !e.isArchived).slice(0, 3);

  const tod = timeOfDay();
  const wins = winsLog.filter((w) => {
    const day = (new Date().getDay() + 6) % 7;
    const weekStart = new Date();
    weekStart.setDate(new Date().getDate() - day);
    weekStart.setHours(0, 0, 0, 0);
    return w.timestamp >= weekStart.getTime();
  }).length;

  const totalSteps = useVitaStore((s) => s.taskSteps);
  const completedSteps = totalSteps.filter((s) => s.isCompleted).length;

  // Record wins for completed steps (once) and vault entry counts
  React.useEffect(() => {
    if (completedSteps > 0) {
      // Fire one win per completed micro-step. The store keeps a log
      // so we can count per-week without double-counting on re-renders.
      // We only record when the store has fewer winsLog entries than
      // completed steps, to avoid duplicates.
      const lastStep = totalSteps.filter((s) => s.isCompleted).slice(-1)[0];
      if (lastStep && winsLog.length < completedSteps) {
        recordWin('step', `Micro-step completato`);
      }
    }
  }, [completedSteps, totalSteps, recordWin, winsLog.length]);

  return (
    <>
      <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* Time-of-day greeting */}
      <View style={s.heroCard}>
        <Text style={s.greeting}>{TOD_GREETING[tod]}</Text>
        <Text style={s.hint}>{TOD_HINT[tod]}</Text>
      </View>

      {/* Wins this week — gentle progress, no shame */}
      <View style={s.winsBar}>
        <Icon name="Trophy" size={20} color={colors.textFaint} />
        <View>
          <Text style={s.winsLabel}>Vittorie questa settimana</Text>
          <Text style={s.winsSub}>micro-step completati e task finiti</Text>
        </View>
        <Text style={s.winsCount}> {wins} </Text>
      </View>

      {/* Quick actions */}
      <View style={s.quickActions}>
        <TouchableOpacity
          style={s.quickBtn}
          onPress={() => nav.navigate('LiorTab')}
        >
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Icon name="Mic" size={16} color={colors.textDim} />
            <Text style={s.quickBtnText}>Voce</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.quickBtn}
          onPress={() => nav.navigate('TasksTab')}
        >
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Icon name="Zap" size={16} color={colors.textDim} />
            <Text style={s.quickBtnText}>Task</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.quickBtn}
          onPress={() => nav.navigate('DiaryTab')}
        >
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Icon name="BookOpen" size={16} color={colors.textDim} />
            <Text style={s.quickBtnText}>Diario</Text>
          </View>
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
        <TouchableOpacity style={s.settingsLink} onPress={() => nav.navigate('Settings')}>
          <Text style={s.settingsLinkText}>Apri Impostazioni →</Text>
        </TouchableOpacity>
      </View>

      {/* Focus card */}
      {focusTask && (
        <View style={s.heroCard}>
          <Text style={s.heroEyebrow}>FOCUS</Text>
          <Text style={s.heroText}>"{focusTask.title}"</Text>
        </View>
      )}

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
    <EmergencyOverlay visible={emergencyMode} />
    </>
  );
}
