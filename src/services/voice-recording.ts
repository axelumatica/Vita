/**
 * src/services/voice-recording.ts
 *
 * Voice recording and Speech-to-Text service using expo-av and react-native-voice.
 *
 * Architecture:
 *   - Records audio to a local file using expo-av Audio.Recording
 *   - Transcribes using the device's built-in speech recognition (react-native-voice)
 *   - Falls back gracefully on permission denial or recognition failure
 *   - Returns plain text ready for the pipeline (no formatting, no markup)
 *
 * Android: Uses native SpeechRecognizer (no network required)
 * iOS: Uses SFSpeechRecognizer (requires microphone permission)
 */

import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import Voice from 'react-native-voice';

// ─────────────────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────────────────

export type VoiceResult = {
  text: string;
  isFinal: boolean;
  confidence?: number;
};

export type VoiceError = {
  code: 'PERMISSION_DENIED' | 'RECOGNITION_FAILED' | 'CANCELLED' | 'UNKNOWN';
  message: string;
};

// ─────────────────────────────────────────────────────────────────────────────
//  Permission helpers
// ─────────────────────────────────────────────────────────────────────────────

async function requestMicrophonePermission(): Promise<boolean> {
  try {
    const { status } = await Audio.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Recording state
// ─────────────────────────────────────────────────────────────────────────────

let recording: Audio.Recording | null = null;
let isListening = false;
let onError: ((error: VoiceError) => void) | null = null;
let onResult: ((result: VoiceResult) => void) | null = null;

// ─────────────────────────────────────────────────────────────────────────────
//  Voice event handlers
// ─────────────────────────────────────────────────────────────────────────────

let onVolume: ((volume: number) => void) | null = null;

Voice.onSpeechStart = () => {
  isListening = true;
};

Voice.onSpeechEnd = () => {
  isListening = false;
};

Voice.onSpeechResults = (event: { value?: string[]; error?: string }) => {
  if (event.error && onError) {
    onError({ code: 'RECOGNITION_FAILED', message: event.error });
    return;
  }
  if (event.value?.[0] && onResult) {
    onResult({ text: event.value[0]!, isFinal: true });
  }
};

Voice.onSpeechVolumeChanged = (event: { value: number }) => {
  // event.value is 0-1 on iOS, but can be higher on Android
  const volume = Math.min(event.value, 1);
  if (onVolume) {
    onVolume(volume);
  }
};

Voice.onSpeechError = (event: { error?: string }) => {
  if (event.error && onError) {
    onError({ code: 'RECOGNITION_FAILED', message: event.error });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if the device is currently listening for speech input.
 */
export function isSpeechListening(): boolean {
  return isListening;
}

/**
 * Get the current recording instance (for debugging/progress display).
 */
export function getActiveRecording(): Audio.Recording | null {
  return recording;
}

/**
 * Start voice recording.
 * Returns a promise that resolves when speech ends or errors.
 */
export async function startRecording(
  onSpeechResult: (result: VoiceResult) => void,
  onErrorCallback: (error: VoiceError) => void,
  onVolumeCallback?: (volume: number) => void,
): Promise<void> {
  // Stop any existing recording
  if (recording) {
    try {
      await recording.stopAndUnloadAsync();
    } catch {
      // Ignore
    }
    recording = null;
  }

  // Request permission
  const hasPermission = await requestMicrophonePermission();
  if (!hasPermission) {
    onErrorCallback({ code: 'PERMISSION_DENIED', message: 'Permesso microfono negato.' });
    return;
  }

  // Configure audio
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    interruptionModeIOS: InterruptionModeIOS.DuckOthers,
    interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
    shouldDuckAndroid: true,
  });

  // Start recording
  recording = new Audio.Recording();
  await recording.prepareToRecordAsync();
  await recording.startAsync();

  // Set up speech recognition
  onResult = onSpeechResult;
  onError = onErrorCallback;
  onVolume = onVolumeCallback ?? null;

  try {
    await Voice.start('it-IT', {
      language: 'it-IT',
      partialResults: false,
    });
  } catch (err) {
    onErrorCallback({
      code: 'RECOGNITION_FAILED',
      message: (err as Error).message || 'Speech recognition failed to start.',
    });
  }
}

/**
 * Stop voice recording and speech recognition.
 */
export async function stopRecording(): Promise<string | null> {
  isListening = false;

  // Stop speech recognition
  try {
    await Voice.stop();
  } catch {
    // Ignore - might not have been listening
  }

  // Stop and save recording
  try {
    if (recording) {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recording = null;
      return uri;
    }
  } catch {
    // Ignore
  }

  return null;
}

/**
 * Cancel voice input (for user abort).
 */
export async function cancelRecording(): Promise<void> {
  isListening = false;

  try {
    await Voice.cancel();
  } catch {
    // Ignore
  }

  try {
    if (recording) {
      await recording.stopAndUnloadAsync();
      recording = null;
    }
  } catch {
    recording = null;
  }
}

