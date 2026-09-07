/**
 * assets/fonts/manifest.ts
 *
 * Font manifest for expo-font. Each entry maps a font family name
 * (as referenced in `src/design/tokens.ts > Fonts`) to its source.
 *
 * Fonts are loaded from the Google Fonts CDN at first paint. If the
 * device is offline the app falls back to the platform sans-serif /
 * monospace families — typography is cosmetic, never a hard dependency.
 *
 * Sources:
 *   - Inter:              https://fonts.google.com/specimen/Inter  (OFL)
 *   - Atkinson Hyperlegible: https://www.brailleinstitute.org/freefont  (OFL)
 *   - JetBrains Mono:     https://www.jetbrains.com/lp/mono/  (OFL)
 */

export type FontMap = Record<string, FontSource>;

export interface FontSource {
  /** Remote URL of the TTF/WOFF2 file, or a local asset path. */
  uri: string;
  /** PostScript name inside the font, must match `fontFamily` references. */
  family: string;
  /** Optional weight for disambiguating multiple faces of the same family. */
  weight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
  /** Optional italic flag. */
  italic?: boolean;
}

export const FONTS: FontMap = {
  // Display — headers, focus card titles (Inter)
  'Inter-Regular': {
    uri: 'https://fonts.gstatic.com/s/inter/v12/UpCmGSY-647qFEfK2VY7.woff2',
    family: 'Inter',
    weight: '400',
  },
  'Inter-SemiBold': {
    uri: 'https://fonts.gstatic.com/s/inter/v12/UpCmGSY-647qFEfK2VY7.woff2',
    family: 'Inter',
    weight: '600',
  },
  'Inter-Bold': {
    uri: 'https://fonts.gstatic.com/s/inter/v12/UpCmGSY-647qFEfK2VY7.woff2',
    family: 'Inter',
    weight: '700',
  },

  // Body — task text, descriptions (Atkinson Hyperlegible)
  'AtkinsonHyperlegible-Regular': {
    uri: 'https://fonts.gstatic.com/s/atkinsonhyperlegible/v1/8nYrCmz1c4Wq3G6TjUgjLw.woff2',
    family: 'Atkinson Hyperlegible',
    weight: '400',
  },
  'AtkinsonHyperlegible-Bold': {
    uri: 'https://fonts.gstatic.com/s/atkinsonhyperlegible/v1/8nYrCmz1c4Wq3G6TjUgjLw.woff2',
    family: 'Atkinson Hyperlegible',
    weight: '700',
  },

  // Mono — status, timers, tags (JetBrains Mono)
  'JetBrainsMono-Regular': {
    uri: 'https://fonts.gstatic.com/s/jetbrainsmono/v13/t8YrIiYiOv0OzD1jFZRf2Q.woff2',
    family: 'JetBrains Mono',
    weight: '400',
  },
  'JetBrainsMono-Medium': {
    uri: 'https://fonts.gstatic.com/s/jetbrainsmono/v13/t8YrIiYiOv0OzD1jFZRf2Q.woff2',
    family: 'JetBrains Mono',
    weight: '500',
  },
};