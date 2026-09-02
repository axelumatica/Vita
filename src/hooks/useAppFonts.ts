/**
 * src/hooks/useAppFonts.ts
 *
 * Loads the custom font families declared in `src/design/tokens.ts`.
 *
 * Returns `fontsLoaded: boolean` — the app should gate the first paint on this
 * (see App.tsx) so the splash screen doesn't flash with system fallback fonts.
 *
 * When no TTFs are present in assets/fonts/, this hook returns true immediately
 * and the app falls back to system fonts (Inter / SF Pro / JetBrains Mono fallback).
 */

import { useMemo } from 'react';
import { useFonts } from 'expo-font';
import { FONTS } from '../../assets/fonts/manifest';

/**
 * Build the font map expected by `useFonts` from the manifest.
 * Empty manifest → no-op, returns true.
 */
function buildFontMap(): Record<string, any> {
  const map: Record<string, any> = {};
  for (const [key, src] of Object.entries(FONTS)) {
    map[src.family] = {
      [src.weight ?? 'normal']: src.file,
    };
  }
  return map;
}

export function useAppFonts(): { fontsLoaded: boolean } {
  const fontMap = useMemo(buildFontMap, []);

  // When the manifest is empty (no TTFs dropped in), useFonts returns
  // [true] immediately and there's nothing to load.
  const [fontsLoaded] = useFonts(fontMap);

  return { fontsLoaded: fontsLoaded || Object.keys(fontMap).length === 0 };
}