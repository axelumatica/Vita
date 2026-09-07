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
import { SafeAreaView, StatusBar, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
import * as SplashScreen from 'expo-splash-screen';
import { NavigationRoot } from './src/navigation/NavigationRoot';
import { ThemeProvider, useTheme } from './src/design/ThemeProvider';
import { useAppFonts } from './src/hooks/useAppFonts';

// Enable native screens + gesture handler for fluid Android gesture support.
// Must run before any navigator mounts.
enableScreens(true);

// Keep splash visible while fonts load
SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore if splash is already hidden
});

function AppShell() {
  const { colors, mode } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar
        barStyle={mode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg}
      />
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AppShell />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
