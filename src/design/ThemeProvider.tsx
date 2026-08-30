import React, { createContext, useContext, useState, useEffect } from 'react';
import { Colors, Radius, Spacing, Fonts, FontSize, LineHeight, Motion, ThemeMode } from './tokens';

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
  const [mode, setMode] = useState<ThemeMode>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('vita-theme');
    if (saved) {
      setMode(saved as ThemeMode);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('vita-theme', mode);
  }, [mode]);

  const colors = mode === 'dark' ? Colors.dark : Colors.light;

  return (
    <ThemeContext.Provider value={{ 
      mode, 
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