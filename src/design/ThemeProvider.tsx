import React, { createContext, useContext, useEffect, useState } from 'react';
import { Appearance, Platform } from 'react-native';
import { Colors, Radius, Spacing, Fonts, FontSize, LineHeight, Motion, ThemeMode } from './tokens';
import { useVitaStore } from '../store/vita-store';

type ThemeContextType = {
  mode: ThemeMode;
  colors: typeof Colors.dark;
  radius: typeof Radius;
  spacing: typeof Spacing;
  font: typeof Fonts;
  fontSize: typeof FontSize;
  lineHeight: typeof LineHeight;
  motion: typeof Motion;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

/**
 * Effective theme = stored preference, or system preference on Android (auto-theme).
 * On Android we follow the system to feel native; on iOS we honor the explicit choice.
 */
function resolveTheme(stored: ThemeMode): ThemeMode {
  if (Platform.OS === 'android') {
    return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
  }
  return stored;
}

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const themeMode = useVitaStore((s) => s.themeMode);
  const [systemScheme, setSystemScheme] = useState(
    Appearance.getColorScheme() ?? 'light',
  );

  // Listen for system theme changes on Android
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme ?? 'light');
    });
    return () => sub.remove();
  }, []);

  const effectiveMode: ThemeMode = Platform.OS === 'android'
    ? (systemScheme === 'dark' ? 'dark' : 'light')
    : themeMode;
  const colors = effectiveMode === 'dark' ? Colors.dark : Colors.light;

  return (
    <ThemeContext.Provider value={{
      mode: effectiveMode,
      colors,
      radius: Radius,
      spacing: Spacing,
      font: Fonts,
      fontSize: FontSize,
      lineHeight: LineHeight,
      motion: Motion,
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const useThemeMode = () => {
  return useTheme().mode;
};