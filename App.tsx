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

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0B132B' }}>
      <StatusBar barStyle="light-content" backgroundColor="#0B132B" />
      <NavigationRoot />
    </SafeAreaView>
  );
}
