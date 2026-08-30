import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { DiaryScreen } from '../screens/DiaryScreen';
import { LiorScreen } from '../screens/LiorScreen';
import { TasksScreen } from '../screens/TasksScreen';
import { VaultScreen } from '../screens/VaultScreen';
import { VoiceSettingsScreen } from '../screens/VoiceSettingsScreen';
import { ThemeProvider, useTheme } from '../design/ThemeProvider';

export type RootStackParamList = {
  MainTabs: undefined;
  VoiceSettings: undefined;
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  const { colors, font } = useTheme();
  const tabs = [
    { id: 'HomeTab', icon: '⌂', label: 'Home' },
    { id: 'DiaryTab', icon: '✎', label: 'Diario' },
    { id: 'LiorTab', icon: '◉', label: 'Lior', center: true },
    { id: 'TasksTab', icon: '⚡', label: 'Tasks' },
    { id: 'VaultTab', icon: '⌕', label: 'Vault' },
  ];

  return (
    <View style={[styles.tabContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
      {tabs.map((tab, i) => {
        const isFocused = state.index === i;
        const isCenter = tab.center;
        return (
          <TouchableOpacity
            key={tab.id}
            activeOpacity={0.7}
            onPress={() => {
              if (!isFocused) {
                navigation.navigate(tab.id, { merge: true });
              }
            }}
            style={[
              styles.tabButton,
              isCenter && styles.tabButtonCenter,
              isFocused && { backgroundColor: colors.accent },
              { borderColor: colors.border },
            ]}
          >
            <Text style={[styles.tabIcon, {
              color: isCenter ? (isFocused ? colors.accentInk : colors.textFaint) : (isFocused ? colors.accent : colors.textFaint),
              fontFamily: font.mono,
            }]}>
              {tab.icon}
            </Text>
            {!isCenter && (
              <Text style={[styles.tabLabel, {
                color: isCenter ? (isFocused ? colors.accentInk : colors.textFaint) : (isFocused ? colors.accent : colors.textFaint),
                fontFamily: font.mono,
              }]}>
                {tab.label}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} />
      <Tab.Screen name="DiaryTab" component={DiaryScreen} />
      <Tab.Screen name="LiorTab" component={LiorScreen} />
      <Tab.Screen name="TasksTab" component={TasksScreen} />
      <Tab.Screen name="VaultTab" component={VaultScreen} />
    </Tab.Navigator>
  );
}

export const NavigationRoot = () => {
  return (
    <ThemeProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen
            name="VoiceSettings"
            component={VoiceSettingsScreen}
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeProvider>
  );
};

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    minHeight: 80,
    backgroundColor: '#1C2541',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  tabButtonCenter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginHorizontal: 0,
    marginTop: -20,
    borderWidth: 4,
    borderColor: '#0B132B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  tabIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 0.03,
  },
});