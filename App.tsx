/**
 * App.tsx
 *
 * Minimal debug entry point — NOT the final app shell.
 *
 * Purpose: get LiorScreen + VoiceSettingsScreen running as fast as possible
 * so the API key + pipeline wiring can be tested end-to-end.
 *
 * What this IS:
 *   - A single-screen toggle: LiorScreen | VoiceSettingsScreen
 *   - Night Vault dark theme hardcoded (no ThemeProvider yet)
 *   - SafeAreaView wrapping
 *
 * What this is NOT:
 *   - The full 5-tab navigation shell
 *   - A production-ready app
 *
 * Once the full NavigationRoot (5 tabs) is restored, this file is replaced.
 */

import React, { useState } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { LiorScreen } from './src/screens/LiorScreen';
import { VoiceSettingsScreen } from './src/screens/VoiceSettingsScreen';

// ─────────────────────────────────────────────────────────────────────────────
//  Screen toggle
// ─────────────────────────────────────────────────────────────────────────────

type Screen = 'lior' | 'settings';

function AppShell() {
  const [screen, setScreen] = useState<Screen>('lior');

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0B132B" />

      {/* Minimal nav bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={[styles.navBtn, screen === 'lior' && styles.navBtnActive]}
          onPress={() => setScreen('lior')}
        >
          <Text style={[styles.navBtnText, screen === 'lior' && styles.navBtnTextActive]}>
            🎙 Lior
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navBtn, screen === 'settings' && styles.navBtnActive]}
          onPress={() => setScreen('settings')}
        >
          <Text style={[styles.navBtnText, screen === 'settings' && styles.navBtnTextActive]}>
            ⚙ Impostazioni
          </Text>
        </TouchableOpacity>
      </View>

      {/* Screen content */}
      {screen === 'lior' ? <LiorScreen /> : <VoiceSettingsScreen />}
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Bootstrap
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  return <AppShell />;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0B132B',
  },
  navBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#0B132B',
    borderBottomWidth: 1,
    borderBottomColor: '#1C2541',
    gap: 8,
  },
  navBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A385B',
    backgroundColor: '#1C2541',
  },
  navBtnActive: {
    backgroundColor: '#F7F4EA',
    borderColor: '#F7F4EA',
  },
  navBtnText: {
    color: '#C5BFB0',
    fontSize: 13,
    fontWeight: '600',
  },
  navBtnTextActive: {
    color: '#0B132B',
  },
});
