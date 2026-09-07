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

import { useTheme } from '../design/ThemeProvider';
import { Fonts } from '../design/tokens';
import { useVitaStore } from '../store/vita-store';
import { Icon } from '../design/Icon';
import { HomeScreen } from '../screens/HomeScreen';
import { DiaryScreen } from '../screens/DiaryScreen';
import { LiorScreen } from '../screens/LiorScreen';
import { TasksScreen } from '../screens/TasksScreen';
import { VaultScreen } from '../screens/VaultScreen';
import { VoiceSettingsScreen } from '../screens/VoiceSettingsScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';

// ─────────────────────────────────────────────────────────────────────────────
//  Navigator types
// ─────────────────────────────────────────────────────────────────────────────

export type RootStackParamList = {
  MainTabs: undefined;
  Settings: undefined; // modal
  Onboarding: undefined;
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
//  Tab bar — raised center button for Lior
// ─────────────────────────────────────────────────────────────────────────────

function useTabStyles() {
  const { colors, radius } = useTheme();
  return StyleSheet.create({
    bar: {
      flexDirection: 'row',
      backgroundColor: colors.bg,
      borderTopWidth: 1,
      borderTopColor: colors.surface,
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
      color: colors.textFaint,
      fontFamily: Fonts.mono,
      letterSpacing: 0.4,
    },
    tabLabelActive: {
      color: colors.text,
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
      backgroundColor: colors.accent,
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
}

function VitaTabBar({ state, descriptors, navigation }: any) {
  const tabStyles = useTabStyles();
  const { colors } = useTheme();
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
                <Icon name="Mic" size={21} color="#F7F4EA" />
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
            <View style={tabStyles.tabIcon}>
              {route.name === 'HomeTab' && <Icon name="Home" size={18} color={isFocused ? colors.text : colors.textFaint} />}
              {route.name === 'DiaryTab' && <Icon name="BookOpen" size={18} color={isFocused ? colors.text : colors.textFaint} />}
              {route.name === 'TasksTab' && <Icon name="Zap" size={18} color={isFocused ? colors.text : colors.textFaint} />}
              {route.name === 'VaultTab' && <Icon name="Archive" size={18} color={isFocused ? colors.text : colors.textFaint} />}
            </View>
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
  const { colors } = useTheme();
  const wasOnboarded = useVitaStore((s) => s.wasOnboarded);

  // Build a theme object from the current palette so the navigation
  // container's background/card/text/border all track the theme.
  const theme = {
    ...DefaultTheme,
    dark: colors.text === '#0B132B',
    colors: {
      ...DefaultTheme.colors,
      background: colors.bg,
      card: colors.bg,
      text: colors.text,
      border: colors.border,
      primary: colors.accent,
    },
  };

  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_bottom',
        }}
      >
        {wasOnboarded ? (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen
              name="Settings"
              component={VoiceSettingsScreen}
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
          </>
        ) : (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}