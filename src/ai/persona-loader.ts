/**
 * src/ai/persona-loader.ts
 *
 * Hot-reload persona loader. Reads `personaMode` and `voiceGender` from the
 * Zustand store at every call — no caching — so switching personas in
 * VoiceSettingsScreen takes effect instantly on the next `chat()` call.
 *
 * Persona file layout (src/ai/personas/):
 *   friendly-female.md   friendly-male.md
 *   seductive-female.md  seductive-male.md
 *   mean-female.md       mean-male.md
 *
 * Each file = the EXACT original lior persona (unchanged) + a mood override.
 * The original `lior-persona-system-prompt.md` in Vita-Assets/ is never touched.
 *
 * React Native / Metro bundles the .md files as raw strings via the
 * module declaration in src/types/modules.d.ts.
 */

import friendlyFemale from './personas/friendly-female.md';
import friendlyMale from './personas/friendly-male.md';
import seductiveFemale from './personas/seductive-female.md';
import seductiveMale from './personas/seductive-male.md';
import meanFemale from './personas/mean-female.md';
import meanMale from './personas/mean-male.md';

import type { PersonaMode, VoiceGender } from '../store/vita-store';
import { useVitaStore } from '../store/vita-store';

/** Lookup table: maps (gender, mood) → persona markdown string. */
const PERSONA_FILES: Record<VoiceGender, Record<PersonaMode, string>> = {
  female: {
    friendly: friendlyFemale,
    seductive: seductiveFemale,
    mean: meanFemale,
  },
  male: {
    friendly: friendlyMale,
    seductive: seductiveMale,
    mean: meanMale,
  },
};

/**
 * Returns the active persona string based on current store state.
 * Called at chat()/extractTasks()/etc. entry points — NOT cached,
 * so persona changes hot-reload instantly.
 */
export function getActivePersona(): string {
  const personaMode = useVitaStore.getState().personaMode;
  const voiceGender = useVitaStore.getState().voiceGender;

  const persona = PERSONA_FILES[voiceGender]?.[personaMode];
  if (!persona) {
    // Fallback to friendly female if something is misconfigured.
    return PERSONA_FILES.female.friendly;
  }

  return persona;
}

/**
 * If the user has unlocked the custom persona slot, use their custom prompt
 * instead of the built-in file. Still reads from store (hot-reload).
 */
export function getActivePersonaOrDefault(): string {
  const state = useVitaStore.getState();

  if (state.customPersonaUnlocked && state.customPersonaPrompt) {
    return state.customPersonaPrompt;
  }

  return getActivePersona();
}
