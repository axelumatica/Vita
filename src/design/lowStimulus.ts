/**
 * src/design/lowStimulus.ts
 *
 * Centralized low-stimulus visual treatment. When the user enables the
 * "Bassa stimolazione" toggle, the app should:
 *   - Reduce motion: freeze or dampen animations
 *   - Reduce contrast: dim secondary text and surface elevation
 *   - Reduce chrome: hide decorative borders, soften shadows
 *   - Reduce input: simpler, larger tap targets, fewer choices
 *
 * This module exposes:
 *   - `lowStimulusStyle(base, lowStimulus)` — utility for per-style conditional
 *   - `useLowStimulusMotion()` — returns motion tokens with reduced durations
 *
 * Use in screens via:
 *   const s = useThemedStyles();
 *   const lowStim = useVitaStore((x) => x.lowStimulus);
 *   const orb = lowStim ? { ...motion, fast: 0, normal: 0, slow: 0 } : motion;
 */

import { useMemo } from 'react';
import { useVitaStore } from '../store/vita-store';
import { Motion } from './tokens';

/** Returns a motion config that drops durations to 0 when low-stim is on. */
export function useLowStimulusMotion() {
  const lowStim = useVitaStore((s) => s.lowStimulus);
  return useMemo(() => {
    if (!lowStim) return Motion;
    return {
      ...Motion,
      fast: 0,
      normal: 0,
      slow: 0,
      orbBreatheHz: 0,
      orbBreatheScale: 1.0,
      orbListenScale: 1.0,
    };
  }, [lowStim]);
}

/** Returns the alpha for visual emphasis. Normal = 1, low-stim = 0.7. */
export function useLowStimulusEmphasis(): number {
  const lowStim = useVitaStore((s) => s.lowStimulus);
  return lowStim ? 0.7 : 1;
}

/**
 * Helper for boolean style conditions. Returns the conditional style only
 * if low-stim is on. Helps when you want a softer variant of a base style.
 */
export function lowStyle<T>(base: T, softer: T, lowStim: boolean): T {
  return lowStim ? softer : base;
}
