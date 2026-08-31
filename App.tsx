/**
 * App.tsx
 *
 * Entry point. Wraps the app in a SafeAreaView and mounts NavigationRoot.
 *
 * NavigationRoot handles:
 *   - 5-tab bottom navigator with raised Lior center button
 *   - Modal stack for VoiceSettingsScreen
 *   - Night Vault dark theme
 */

import React from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import { NavigationRoot } from './src/navigation/NavigationRoot';
import { ThemeProvider, useTheme } from './src/design/ThemeProvider';

function AppShell() {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <NavigationRoot />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}
