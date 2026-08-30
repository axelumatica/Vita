import 'react-native-gesture-handler';
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
