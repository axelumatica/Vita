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

import React, { useEffect, useState } from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { NavigationRoot } from './src/navigation/NavigationRoot';
import { ThemeProvider, useTheme } from './src/design/ThemeProvider';
import { useAppFonts } from './src/hooks/useAppFonts';

// Keep splash visible while fonts load
SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore if splash is already hidden
});

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
  const { fontsLoaded } = useAppFonts();
  const [showMainUI, setShowMainUI] = useState(false);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
      setShowMainUI(true);
    }
  }, [fontsLoaded]);

  if (!showMainUI) {
    // Splash is handled natively by expo-splash-screen (configured in app.json)
    return null;
  }

  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}
