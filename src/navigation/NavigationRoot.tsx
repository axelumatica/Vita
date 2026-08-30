/**
 * src/navigation/NavigationRoot.tsx
 *
 * Root navigator: Stack (hidden header) wrapping a bottom Tab.Navigator.
 *
 * Layout from the spec:
 *   [Home]  [Diary]  (( LIOR ))  [Tasks]  [Vault]
 *   (Hub)    (Reflect) (Companion)  (Do)     (Archive)
 *
 * The center tab (Lior) renders as a raised floating button — not a normal
 * tab icon. Tapping it navigates to the LiorScreen.
 *
 * VoiceSettingsScreen is presented modally from the Lior tab.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { HomeScreen } from '../screens/HomeScreen';
import { DiaryScreen } from '../screens/DiaryScreen';
import { LiorScreen } from '../screens/LiorScreen';
import { TasksScreen } from '../screens/TasksScreen';
import { VaultScreen } from '../screens/VaultScreen';
import { VoiceSettingsScreen } from '../screens/VoiceSettingsScreen';

// ─────────────────────────────────────────────────────────────────────────────
//  Navigator types
// ─────────────────────────────────────────────────────────────────────────────

export type RootStackParamList = {
  MainTabs: undefined;
  Settings: undefined; // modal
};

export type MainTabsParamList = {
  HomeTab: undefined;
  DiaryTab: undefined;
  LiorTab: undefined;
  TasksTab: undefined;
  VaultTab: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabsParamList>();

// ─────────────────────────────────────────────────────────────────────────────
//  Dark theme
// ─────────────────────────────────────────────────────────────────────────────

const VitaDarkTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    background: '#0B132B',
    card: '#0B132B',
    text: '#F7F4EA',
    border: '#2A385B',
    primary: '#F7F4EA',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
//  Custom tab bar — raised center button for Lior
// ─────────────────────────────────────────────────────────────────────────────

function VitaTabBar({ state, descriptors, navigation }: any) {
  return (
    <View style={tabStyles.bar}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel ?? options.title ?? route.name;
        const isFocused = state.index === index;

        // The center tab (Lior) gets special raised treatment.
        const isLior = route.name === 'LiorTab';

        if (isLior) {
          return (
            <View key={route.key} style={tabStyles.liorWrap}>
              <TouchableOpacity
                style={tabStyles.liorBtn}
                onPress={() => navigation.navigate(route.name)}
                activeOpacity={0.8}
              >
                <Text style={tabStyles.liorBtnText}>🎙</Text>
              </TouchableOpacity>
            </View>
          );
        }

        return (
          <TouchableOpacity
            key={route.key}
            style={tabStyles.tab}
            onPress={() => navigation.navigate(route.name)}
          >
            <Text style={tabStyles.tabIcon}>
              {route.name === 'HomeTab' && '🏠'}
              {route.name === 'DiaryTab' && '📖'}
              {route.name === 'TasksTab' && '⚡'}
              {route.name === 'VaultTab' && '🗂'}
            </Text>
            <Text
              style={[tabStyles.tabLabel, isFocused && tabStyles.tabLabelActive]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#0B132B',
    borderTopWidth: 1,
    borderTopColor: '#1C2541',
    paddingBottom: 20, // safe area bottom
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 6,
  },
  tabIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 10,
    color: '#7c8299',
    fontFamily: 'monospace',
    letterSpacing: 0.4,
  },
  tabLabelActive: {
    color: '#F7F4EA',
    fontWeight: '600',
  },
  // Lior raised center button
  liorWrap: {
    flex: 1,
    alignItems: 'center',
    marginTop: -20, // pulls it above the bar
  },
  liorBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F7F4EA',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
  },
  liorBtnText: {
    fontSize: 20,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
//  Tab navigator
// ─────────────────────────────────────────────────────────────────────────────

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <VitaTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="DiaryTab"
        component={DiaryScreen}
        options={{ tabBarLabel: 'Diario' }}
      />
      <Tab.Screen
        name="LiorTab"
        component={LiorScreen}
        options={{ tabBarLabel: 'Lior' }}
      />
      <Tab.Screen
        name="TasksTab"
        component={TasksScreen}
        options={{ tabBarLabel: 'Tasks' }}
      />
      <Tab.Screen
        name="VaultTab"
        component={VaultScreen}
        options={{ tabBarLabel: 'Vault' }}
      />
    </Tab.Navigator>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Root navigator
// ─────────────────────────────────────────────────────────────────────────────

export function NavigationRoot() {
  return (
    <NavigationContainer theme={VitaDarkTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_bottom',
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen
          name="Settings"
          component={VoiceSettingsScreen}
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
