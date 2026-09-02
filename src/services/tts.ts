/**
 * src/services/tts.ts
 *
 * Text-to-speech service for Lior using Microsoft Edge TTS.
 *
 * Architecture:
 *   - Voice profile (pitch/rate/volume) is read from the Zustand store at
 *     every call — hot reload, no caching. Switching personas in
 *     VoiceSettingsScreen takes effect on the next speak() call.
 *   - Fetches audio from Edge TTS (free neural voices) and plays via expo-av.
 *   - Voice profiles use Edge TTS neural voice names:
 *       it-IT-IsabellaNeural (female)
 *       it-IT-DiegoNeural (male)
 *
 * Why Edge TTS:
 *   - 100% free, no API key required
 *   - Natural neural voices, not robotic system TTS
 *   - Italian voices available (Isabella, Diego)
 *
 * Edge TTS endpoint (public, no auth):
 *   https://edgespeech.netsvc.net/api/texttospeech
 */

import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { useVitaStore } from '../store/vita-store';
import { getVoiceProfileById } from '../ai/voice-profiles';

// ─────────────────────────────────────────────────────────────────────────────
//  Edge TTS types & config
// ─────────────────────────────────────────────────────────────────────────────

const EDGE_TTS_BASE = 'https://edgespeech.netsvc.net/api/texttospeech';
// App ID for Edge TTS (public demo endpoint)
const EDGE_APP_ID = '4bf4f0e4f1f64f2a9e2b3c4d5e6f7a8b';

interface EdgeTTSParams {
  appId: string;
  appKey: string;
  text: string;
  voice: string;
  rate: string;    // e.g. "+0%", "-10%"
  pitch: string;   // e.g. "+0Hz", "-3Hz"
  volume: string;  // e.g. "+0%", "-20%"
}

function buildEdgeTTSUrl(params: EdgeTTSParams): string {
  const qs = new URLSearchParams({
    appId: params.appId,
    appKey: params.appKey,
    text: params.text,
    voice: params.voice,
    rate: params.rate,
    pitch: params.pitch,
    volume: params.volume,
  });
  return `${EDGE_TTS_BASE}?${qs.toString()}`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Voice profile helpers (Edge TTS units)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert Edge TTS pitch (-20..+20 semitones) to Hz offset string.
 * Edge TTS expects format like "+0Hz" or "-3Hz".
 */
function pitchToEdge(pitch: number): string {
  if (pitch === 0) return '+0Hz';
  return pitch > 0 ? `+${pitch}Hz` : `${pitch}Hz`;
}

/**
 * Convert Edge TTS rate (-1.0..+1.0) to percentage string.
 * Edge TTS expects format like "+0%", "-10%", "+50%".
 */
function rateToEdge(rate: number): string {
  const pct = Math.round(rate * 100);
  if (pct === 0) return '+0%';
  return pct > 0 ? `+${pct}%` : `${pct}%`;
}

/**
 * Convert Edge TTS volume (-1.0..+1.0) to percentage string.
 */
function volumeToEdge(volume: number): string {
  const pct = Math.round(volume * 100);
  if (pct === 0) return '+0%';
  return pct > 0 ? `+${pct}%` : `${pct}%`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Playback state
// ─────────────────────────────────────────────────────────────────────────────

let currentSound: Audio.Sound | null = null;
let speakResolve: (() => void) | null = null;

/**
 * Get the active voice profile from the store at call time.
 */
function getActiveProfile() {
  const state = useVitaStore.getState();
  const profileId = state.voiceProfileId;
  return getVoiceProfileById(profileId) ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Speak text using Edge TTS neural voices.
 *
 * Fetches audio from Edge TTS and plays it via expo-av.
 * Respects the active voice profile (gender × mood).
 *
 * @param text Text to speak (Italian, Lior's response).
 */
export async function speak(text: string): Promise<void> {
  if (!text || text.trim().length === 0) return;

  // Stop any current playback
  await stop();

  const profile = getActiveProfile();

  // Build Edge TTS URL
  const url = buildEdgeTTSUrl({
    appId: EDGE_APP_ID,
    appKey: EDGE_APP_ID,
    text,
    voice: profile?.voiceName ?? 'it-IT-IsabellaNeural',
    rate: profile ? rateToEdge(profile.rate) : '+0%',
    pitch: profile ? pitchToEdge(profile.pitch) : '+0Hz',
    volume: profile ? volumeToEdge(profile.volume) : '+0%',
  });

  // Configure audio session
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    interruptionModeIOS: InterruptionModeIOS.DuckOthers,
    interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });

  // Create and load the sound
  const { sound } = await Audio.Sound.createAsync(
    { uri: url },
    { shouldPlay: true },
    (status) => {
      if (status.isLoaded && status.didJustFinish) {
        currentSound = null;
        speakResolve?.();
        speakResolve = null;
      }
    },
  );

  currentSound = sound;

  // Return a promise that resolves when playback finishes
  return new Promise<void>((resolve) => {
    speakResolve = resolve;
  });
}

/**
 * Interrupt current speech and clear the queue.
 */
export async function stop(): Promise<void> {
  if (currentSound) {
    try {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
    } catch {
      // Ignore — sound may already be unloaded
    }
    currentSound = null;
  }
  speakResolve = null;
}

/**
 * Check whether TTS is currently speaking.
 */
export async function isSpeaking(): Promise<boolean> {
  if (!currentSound) return false;
  try {
    const status = await currentSound.getStatusAsync();
    return status.isLoaded && status.isPlaying;
  } catch {
    return false;
  }
}

/**
 * Pause TTS playback.
 */
export async function pause(): Promise<void> {
  if (currentSound) {
    await currentSound.pauseAsync();
  }
}

/**
 * Resume paused TTS playback.
 */
export async function resume(): Promise<void> {
  if (currentSound) {
    await currentSound.playAsync();
  }
}
