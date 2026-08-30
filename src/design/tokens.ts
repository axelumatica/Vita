// Vita Design System — "Anti-Vibecode Engineering" tokens.
// Dark = Night Vault (Deep Midnight Blue + Warm Cream)
// Light = Day Canvas (Warm Cream + Deep Midnight Blue) — inverted
// No hard shadows anywhere; elevation is simulated with subtle top-edge highlights.

export type ThemeMode = 'dark' | 'light';

export const Colors = {
  dark: {
    bg:           '#0B132B',  // Deep Midnight Blue — main background
    surface:      '#1C2541',  // Dark Indigo Slate — bento card / modal surface
    surface2:     '#161d38',  // Secondary elevated surface
    border:       '#2A385B',  // Muted Navy Glass — hairline borders
    text:         '#F7F4EA',  // Warm Cream — primary text / accent
    textDim:      '#C5BFB0',  // Soft Cream Dust — secondary text
    textFaint:    '#7c8299',  // labels, dates, metadata
    accent:       '#F7F4EA',  // Warm Cream — primary accent, Lior orb glow
    accentInk:    '#0B132B',  // text on accent bg
    amber:        '#F59E0B',  // priority / urgency, held constant across themes
    success:      '#7EA88B',  // completion green
    danger:       '#D97070',  // destructive
    shadowTop:    'rgba(255,255,255,0.06)',  // top-edge elevation highlight
  },
  light: {
    bg:           '#F7F4EA',  // Warm Cream — main background
    surface:      '#EBE5D8',  // Soft Sand / Paper — bento card / modal surface
    surface2:     '#f2ede0',  // Secondary elevated surface
    border:       '#D6CEBE',  // Warm Beige Border — hairline borders
    text:         '#0B132B',  // Deep Midnight Blue — primary text / accent
    textDim:      '#4A5568',  // Muted Navy Slate — secondary text
    textFaint:    '#8a90a3',  // labels, dates, metadata
    accent:       '#0B132B',  // Deep Midnight Blue — primary accent, Lior orb pulse
    accentInk:    '#F7F4EA',  // text on accent bg
    amber:        '#F59E0B',  // priority / urgency, held constant across themes
    success:      '#7EA88B',  // completion green
    danger:       '#D97070',  // destructive
    shadowTop:    'rgba(11,19,43,0.05)',  // top-edge elevation highlight
  },
};

// Radius tokens — soft, tactile, never sharp
export const Radius = {
  sm: 10,
  md: 16,   // small components
  lg: 24,   // cards
};

// Spacing — consistent 4px grid
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// Typography — three-role system, never mixed
// Headers/titles → Inter / SF Pro Display, Bold/SemiBold, tight tracking (-0.02em)
// Body/task text → Atkinson Hyperlegible, Regular/Medium, 150% line-height
// Status/timers/tags/orb labels → JetBrains Mono — micro-labels only
export const Fonts = {
  display: 'Inter',        // or SF Pro Display — headers, focus card titles
  body:    'Atkinson Hyperlegible',  // or SF Pro Text — body, task text
  mono:    'JetBrains Mono', // status, timers, tags, transcript strip
};

// Font sizes
export const FontSize = {
  h1: 24,
  h2: 22,
  title: 19,
  body: 15,
  bodySm: 14,
  mono: 11,
  monoSm: 10,
};

// Line-height — generous 150% on body text
export const LineHeight = {
  body: 1.5,
  title: 1.3,
};

// Motion — soft ease-in-out cubic-bezier, 200–250ms, 60fps floor
export const Motion = {
  fast: 180,
  normal: 220,
  slow: 260,
  easing: 'cubic-bezier(0.42, 0.0, 0.58, 1.0)',  // ease-in-out
  orbBreatheHz: 0.2,  // idle breathing rhythm
  orbBreatheScale: 1.045,  // idle breathing scale
  orbListenScale: 1.15,  // listening expansion (15–20%)
};

// Haptics — precision micro-haptics, no sound by default
export const Haptics = {
  confirm:    'light',    // micro-step complete — sharp, ~10ms
  complete:   'medium',   // focus task complete — deep "pop" + decay, ~50ms
  reduce:     'heavy',    // reduce further — two-step click, 5ms–pause–5ms
  bargeIn:    'medium',   // barge-in interrupt — short dull stop, ~20ms
  emergency:  'soft',     // enter emergency mode — fluid decompressive wave, 200ms
};