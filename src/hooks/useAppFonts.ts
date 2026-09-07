/**
 * src/hooks/useAppFonts.ts
 *
 * Loads custom font families declared in `src/design/tokens.ts`.
 *
 * Returns `fontsLoaded: boolean` — the app gates the first paint on this
 * (see App.tsx) so the splash screen doesn't flash with system fallback fonts.
 *
 * Fonts are loaded from Google Fonts CDN (see assets/fonts/manifest.ts).
 * When the manifest is empty or the device is offline, this hook returns
 * true immediately and the app falls back to the platform sans-serif /
 * monospace families.
 */

import { useMemo } from 'react';
import { useFonts } from 'expo-font';
import { FONTS } from '../../assets/fonts/manifest';

/**
 * Build the font map expected by `useFonts` from the manifest.
 * Each entry maps a family name → { weight → { uri } }.
 */
function buildFontMap(): Record<string, Record<string, any>> {
  const map: Record<string, Record<string, any>> = {};
  for (const [, src] of Object.entries(FONTS)) {
    const family = src.family;
    const weight = src.weight ?? 'normal';
    if (!map[family]) {
      map[family] = {};
    }
    map[family][weight] = { uri: src.uri };
  }
  return map;
}

export function useAppFonts(): { fontsLoaded: boolean } {
  const fontMap = useMemo(buildFontMap, []);

  // If the manifest is empty, useFonts returns [true] immediately.
  const [fontsLoaded] = useFonts(fontMap);

  return {
    fontsLoaded: fontsLoaded || Object.keys(fontMap).length === 0,
  };
}