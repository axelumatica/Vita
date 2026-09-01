/**
 * src/services/tts.ts
 *
 * Text-to-speech service for Lior.
 *
 * Architecture:
 *   - Voice profile (pitch/rate/volume) is read from the Zustand store at
 *     every call — hot reload, no caching. Switching personas in
 *     VoiceSettingsScreen takes effect on the next speak() call.
 *   - Uses expo-speech for playback with profile-adjusted params.
 *   - Profile params (pitch in semitones, rate/volume as multipliers)
 *     are converted from Edge TTS units to expo-speech units at call time.
 *   - Attempts to select a device voice matching the profile's gender
 *     (Italian female/male) before falling back to any Italian voice.
 *
 * Free tier: 100% expo-speech. No API keys, no external services required.
 * Voice profiles give perceived voice variation via pitch/rate/volume params.
 */

import { useVitaStore } from '../store/vita-store';
import { getVoiceProfileById } from '../ai/voice-profiles';
import type { Voice } from 'expo-speech';

/**
 * Convert Edge TTS pitch (semitones, -20..+20) to expo-speech pitch
 * (1.0 = normal, 2.0 = octave up, 0.5 = half speed).
 */
function edgePitchToExpo(pitch: number): number {
  return Math.min(2, Math.max(0.5, 1 + pitch * 0.1));
}

/**
 * Convert Edge TTS rate (-1.0..+1.0) to expo-speech rate (1.0 = normal).
 * expo-speech rate range is roughly 0.5..2.0.
 */
function edgeRateToExpo(rate: number): number {
  return Math.min(2, Math.max(0.5, 1.0 + rate));
}

/**
 * Convert Edge TTS volume (-1.0..+1.0) to expo-speech volume (0.0..1.0).
 */
function edgeVolumeToExpo(volume: number): number {
  return Math.min(1, Math.max(0, (volume + 1) / 2));
}

/**
 * Get the active voice profile from the store at call time.
 */
function getActiveProfile() {
  const state = useVitaStore.getState();
  const profileId = state.voiceProfileId;
  return getVoiceProfileById(profileId) ?? null;
}

/**
 * Find the best matching device voice for the given profile.
 * Strategy:
 *   1. Exact name match
 *   2. Contains-match (fuzzy)
 *   3. Gender heuristic: Isabella → female Italian, Diego → male Italian
 *   4. Any Italian voice as last resort
 */
async function findBestVoice(profile: NonNullable<ReturnType<typeof getActiveProfile>>): Promise<string | null> {
  const Speech = await import('expo-speech');
  let voices: Voice[] = [];
  try {
    voices = await Speech.getAvailableVoicesAsync();
  } catch {
    return null;
  }

  if (voices.length === 0) return null;

  const voiceName = profile.voiceName;

  // 1. Exact match
  const exact = voices.find(v => v.name === voiceName);
  if (exact) return exact.name;

  // 2. Contains match (case-insensitive)
  const contains = voices.find(v =>
    v.name.toLowerCase().includes(voiceName.toLowerCase())
  );
  if (contains) return contains.name;

  // 3. Gender heuristic: Isabella → female Italian, Diego → male Italian
  const isFemale = voiceName.toLowerCase().includes('isabella');
  const isMale = voiceName.toLowerCase().includes('diego');

  if (isFemale || isMale) {
    // Look for Italian voice with female/male in the name
    const italianVoices = voices.filter(v => /it[-_]?it/i.test(v.language));
    if (italianVoices.length > 0) {
      // Prefer voices with explicit gender in name
      const genderKeyword = isFemale ? /femmina|female|donna|isabella/i : /maschio|male|uomo|diego/i;
      const gendered = italianVoices.find(v => genderKeyword.test(v.name));
      if (gendered) return gendered.name;
      // Fall back to any Italian voice of that gender
      return italianVoices[0]!.name;
    }
  }

  // 4. Any Italian voice as last resort
  const anyItalian = voices.find(v => /it[-_]?it/i.test(v.language));
  return anyItalian?.name ?? null;
}

/**
 * Speak text using the active voice profile.
 *
 * @param text Text to speak (Italian, Lior's response).
 */
export async function speak(text: string): Promise<void> {
  if (!text || text.trim().length === 0) return;

  const profile = getActiveProfile();
  const Speech = await import('expo-speech');

  const pitch = profile ? edgePitchToExpo(profile.pitch) : 1.0;
  const rate = profile ? edgeRateToExpo(profile.rate) : 1.0;
  const volume = profile ? edgeVolumeToExpo(profile.volume) : 1.0;

  const opts: Parameters<typeof Speech.speak>[1] = {
    language: 'it-IT',
    pitch,
    rate,
  };

  // Try to match a real device voice to the profile
  if (profile) {
    const matchedVoice = await findBestVoice(profile);
    if (matchedVoice) {
      opts.voice = matchedVoice;
    }
  }

  return new Promise((resolve, reject) => {
    const cleanText = text.length > Speech.maxSpeechInputLength
      ? text.slice(0, Speech.maxSpeechInputLength)
      : text;

    Speech.speak(cleanText, {
      ...opts,
      onDone: resolve,
      onError: reject,
    });
  });
}

/**
 * Interrupt current speech and clear the queue.
 */
export async function stop(): Promise<void> {
  const Speech = await import('expo-speech');
  await Speech.stop();
}

/**
 * Check whether TTS is currently speaking.
 */
export async function isSpeaking(): Promise<boolean> {
  const Speech = await import('expo-speech');
  return Speech.isSpeakingAsync();
}

/**
 * Pause TTS (not available on Android).
 */
export async function pause(): Promise<void> {
  const Speech = await import('expo-speech');
  await Speech.pause();
}

/**
 * Resume paused TTS (not available on Android).
 */
export async function resume(): Promise<void> {
  const Speech = await import('expo-speech');
  await Speech.resume();
}
