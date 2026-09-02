/**
 * assets/fonts/manifest.ts
 *
 * Font file manifest for expo-font. Each entry maps a font family name
 * (as referenced in `src/design/tokens.ts > Fonts`) to its TTF file path.
 *
 * To enable typography:
 *  1. Drop TTF files into assets/fonts/
 *  2. Add the entry below with the actual filename
 *  3. Wire src/hooks/useAppFonts.ts to load via useFonts()
 *  4. App.tsx renders a splash gate until fonts resolve
 *
 * Recommended sources:
 *   - Inter:           https://fonts.google.com/specimen/Inter  (OFL)
 *   - Atkinson Hyperlegible: https://www.brailleinstitute.org/freefont  (OFL)
 *   - JetBrains Mono:  https://www.jetbrains.com/lp/mono/  (OFL)
 */

export type FontMap = Record<string, FontSource>;

export interface FontSource {
  /** Path inside the assets folder, e.g. './assets/fonts/Inter-Regular.ttf' */
  file: string;
  /** PostScript name inside the font, must match `fontFamily` references */
  family: string;
  /** Optional weight for disambiguating multiple TTFs of the same family */
  weight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
  /** Optional italic flag */
  italic?: boolean;
}

export const FONTS: FontMap = {
  // Display — headers, focus card titles
  // 'Inter-Regular':  { file: './assets/fonts/Inter-Regular.ttf',  family: 'Inter', weight: '400' },
  // 'Inter-SemiBold': { file: './assets/fonts/Inter-SemiBold.ttf', family: 'Inter', weight: '600' },
  // 'Inter-Bold':     { file: './assets/fonts/Inter-Bold.ttf',     family: 'Inter', weight: '700' },

  // Body — task text, descriptions
  // 'AtkinsonHyperlegible-Regular': { file: './assets/fonts/AtkinsonHyperlegible-Regular.ttf', family: 'Atkinson Hyperlegible', weight: '400' },
  // 'AtkinsonHyperlegible-Bold':    { file: './assets/fonts/AtkinsonHyperlegible-Bold.ttf',    family: 'Atkinson Hyperlegible', weight: '700' },

  // Mono — status, timers, tags
  // 'JetBrainsMono-Regular': { file: './assets/fonts/JetBrainsMono-Regular.ttf', family: 'JetBrains Mono', weight: '400' },
};
