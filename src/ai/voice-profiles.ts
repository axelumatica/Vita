/**
 * Edge TTS Voice Profiles for Lior
 *
 * Microsoft Neural Voices for Italian:
 * - it-IT-IsabellaNeural (female)
 * - it-IT-DiegoNeural (male)
 *
 * Pitch range: -20 to +20 (semitones)
 * Rate range: -1.0 to +1.0 (speed multiplier)
 * Volume range: -1.0 to +1.0 (gain)
 *
 * These profiles are read at TTS call time — hot reload is automatic
 * via Zustand store subscription. No caching in the TTS service.
 */

export type Gender = 'female' | 'male';
export type Mood = 'friendly' | 'seductive' | 'mean';

export interface VoiceProfile {
  id: `${Gender}-${Mood}`;
  gender: Gender;
  mood: Mood;
  voiceName: string;
  pitch: number;    // semitones, -20 to +20
  rate: number;     // -1.0 to +1.0
  volume: number;   // -1.0 to +1.0
  label: string;    // UI display label
}

export const VOICE_PROFILES: readonly VoiceProfile[] = [
  {
    id: 'female-friendly',
    gender: 'female',
    mood: 'friendly',
    voiceName: 'it-IT-IsabellaNeural',
    pitch: 0,
    rate: 0,
    volume: 0,
    label: 'Female — Friendly',
  },
  {
    id: 'male-friendly',
    gender: 'male',
    mood: 'friendly',
    voiceName: 'it-IT-DiegoNeural',
    pitch: 0,
    rate: 0,
    volume: 0,
    label: 'Male — Friendly',
  },
  {
    id: 'female-seductive',
    gender: 'female',
    mood: 'seductive',
    voiceName: 'it-IT-IsabellaNeural',
    pitch: -3,       // slightly deeper, warmer
    rate: +0.2,      // slightly faster, more intimate
    volume: -0.2,    // slightly quieter, intimate
    label: 'Female — Seductive',
  },
  {
    id: 'male-seductive',
    gender: 'male',
    mood: 'seductive',
    voiceName: 'it-IT-DiegoNeural',
    pitch: -3,       // slightly deeper
    rate: +0.2,
    volume: -0.2,
    label: 'Male — Seductive',
  },
  {
    id: 'female-mean',
    gender: 'female',
    mood: 'mean',
    voiceName: 'it-IT-IsabellaNeural',
    pitch: +5,       // higher, tenser
    rate: -0.3,      // slower, deliberate
    volume: -0.3,    // quieter, controlled anger
    label: 'Female — Mean',
  },
  {
    id: 'male-mean',
    gender: 'male',
    mood: 'mean',
    voiceName: 'it-IT-DiegoNeural',
    pitch: +5,
    rate: -0.3,
    volume: -0.3,
    label: 'Male — Mean',
  },
] as const;

export function getVoiceProfile(gender: Gender, mood: Mood): VoiceProfile {
  return VOICE_PROFILES.find(p => p.gender === gender && p.mood === mood) ?? VOICE_PROFILES[0];
}

export function getVoiceProfileById(id: string): VoiceProfile | undefined {
  return VOICE_PROFILES.find(p => p.id === id);
}

export const DEFAULT_VOICE_PROFILE = VOICE_PROFILES[0];
export const DEFAULT_VOICE_PROFILE_ID: VoiceProfileId = DEFAULT_VOICE_PROFILE.id;

export type VoiceProfileId = typeof VOICE_PROFILES[number]['id'];