import React, { createContext, useContext } from 'react';
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

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const themeMode = useVitaStore((s) => s.themeMode);
  const colors = themeMode === 'dark' ? Colors.dark : Colors.light;

  return (
    <ThemeContext.Provider value={{
      mode: themeMode,
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