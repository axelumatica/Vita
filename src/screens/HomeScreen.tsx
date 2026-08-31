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
import type { RootStackParamList } from '../navigation/NavigationRoot';

type HomeNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<Record<string, undefined>>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function HomeScreen() {
  const nav = useNavigation<HomeNavProp>();
  const vaultEntries = useVitaStore((s) => s.vaultEntries);
  const focusTaskId = useVitaStore((s) => s.focusTaskId);
  const apiKey = useVitaStore((s) => s.openRouterApiKey);

  const focusTask = vaultEntries.find((e) => e.id === focusTaskId);
  const recent = vaultEntries.filter((e) => !e.isArchived).slice(0, 3);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero card */}
      <View style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>🎯 FOCUS UNICO</Text>
        <Text style={styles.heroText}>
          {focusTask
            ? `Focus: "${focusTask.title}"`
            : 'Nessun task in focus.\nParla con Lior per iniziare.'}
        </Text>
      </View>

      {/* Quick actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickBtn}
          onPress={() => nav.navigate('LiorTab')}
        >
          <Text style={styles.quickBtnText}>🎙 Voce</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickBtn}
          onPress={() => nav.navigate('TasksTab')}
        >
          <Text style={styles.quickBtnText}>⚡ Task</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickBtn}
          onPress={() => nav.navigate('DiaryTab')}
        >
          <Text style={styles.quickBtnText}>📖 Diario</Text>
        </TouchableOpacity>
      </View>

      {/* System status */}
      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, apiKey ? styles.statusDotOn : undefined]} />
          <Text style={styles.statusText}>
            {apiKey ? 'Cloud Engine configurato' : 'Cloud Engine non configurato'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.settingsLink}
          onPress={() => nav.navigate('Settings')}
        >
          <Text style={styles.settingsLinkText}>Apri Impostazioni ↑</Text>
        </TouchableOpacity>
      </View>

      {/* Recent entries */}
      {vaultEntries.filter((e) => !e.isArchived).length > 0 && (
        <View style={styles.recentCard}>
          <Text style={styles.sectionLabel}>RECENTI</Text>
          {recent.map((entry) => (
            <View key={entry.id} style={styles.recentItem}>
              <Text style={styles.recentText} numberOfLines={2}>
                {entry.content || entry.title}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B132B',
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  heroCard: {
    backgroundColor: '#1C2541',
    borderWidth: 1,
    borderColor: '#2A385B',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  heroEyebrow: {
    color: '#7c8299',
    fontSize: 11,
    fontFamily: 'monospace',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  heroText: {
    color: '#F7F4EA',
    fontSize: 16,
    lineHeight: 24,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: '#1C2541',
    borderWidth: 1,
    borderColor: '#2A385B',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  quickBtnText: {
    color: '#C5BFB0',
    fontSize: 13,
    fontWeight: '600',
  },
  statusCard: {
    backgroundColor: '#1C2541',
    borderWidth: 1,
    borderColor: '#2A385B',
    borderRadius: 14,
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
  settingsLink: {
    alignSelf: 'flex-start',
  },
  settingsLinkText: {
    color: '#F7F4EA',
    fontSize: 13,
    fontWeight: '600',
  },
  recentCard: {
    marginTop: 8,
  },
  sectionLabel: {
    color: '#7c8299',
    fontSize: 10,
    fontFamily: 'monospace',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  recentItem: {
    backgroundColor: '#161d38',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#2A385B',
  },
  recentText: {
    color: '#C5BFB0',
    fontSize: 13,
  },
});
