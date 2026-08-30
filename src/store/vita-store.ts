/**
 * src/store/vita-store.ts
 *
 * Single Zustand store with persist middleware.
 * Persists to AsyncStorage under the key 'vita-store'.
 *
 * This is a minimal restore focused on what's needed to make the AI
 * pipeline usable: a settable OpenRouter API key, plus the minimal app
 * shape that VoiceSettingsScreen and LiorScreen need to wire it up.
 *
 * Full restore of vaultEntries, taskSteps, projectClusters, focusTaskId,
 * theme, voice/persona, low-stimulus flag, etc. is left to a future
 * session — only the API key + chat scratchpad state are added here.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────────────────

/** Minimal Lior model routing state — which model per role the user picked. */
export interface LiorModelSelection {
  chat: string;       // OpenRouter model ID for conversational chat
  extract: string;    // OpenRouter model ID for task extraction
  breakdown: string;  // OpenRouter model ID for micro-step breakdown
}

/** A single chat turn staged in the Live Scratchpad before confirmation. */
export interface ScratchpadEntry {
  id: string;
  text: string;
  timestamp: number;
}

/**
 * The full store shape. Kept narrow on purpose — only the fields that
 * VoiceSettingsScreen + LiorScreen need to make the AI pipeline work.
 * Other fields (vaultEntries, taskSteps, theme, etc.) will be added when
 * those screens are restored.
 */
export interface VitaStore {
  // ── OpenRouter integration ──────────────────────────────────────────
  openRouterApiKey: string;
  setOpenRouterApiKey: (key: string) => void;
  clearOpenRouterApiKey: () => void;

  /** Which OpenRouter model to use for each Lior subsystem. */
  modelSelection: LiorModelSelection;
  setModelFor: (role: keyof LiorModelSelection, modelId: string) => void;

  // ── Live Scratchpad (staging area for in-progress conversation) ─────
  scratchpad: ScratchpadEntry[];
  addToScratchpad: (text: string) => void;
  clearScratchpad: () => void;

  // ── UI flags ────────────────────────────────────────────────────────
  isListening: boolean;
  setIsListening: (listening: boolean) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Defaults
// ─────────────────────────────────────────────────────────────────────────────

/** Default model routing — must match lior-models.ts catalog. */
const DEFAULT_MODEL_SELECTION: LiorModelSelection = {
  chat: 'google/gemini-2.0-flash-exp:free',
  extract: 'meta-llama/llama-3.1-8b-instruct:free',
  breakdown: 'deepseek/deepseek-r1:free',
};

// ─────────────────────────────────────────────────────────────────────────────
//  Store
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The persisted Zustand store. AsyncStorage key: 'vita-store'.
 *
 * Usage from a screen:
 *   const apiKey = useVitaStore((s) => s.openRouterApiKey);
 *   const setKey = useVitaStore((s) => s.setOpenRouterApiKey);
 *
 * Usage from a non-component (e.g. the pipeline call site):
 *   import { useVitaStore } from '@/store/vita-store';
 *   const key = useVitaStore.getState().openRouterApiKey;
 */
export const useVitaStore = create<VitaStore>()(
  persist(
    (set) => ({
      // ── OpenRouter integration ──────────────────────────────────────
      openRouterApiKey: '',
      setOpenRouterApiKey: (key) => set({ openRouterApiKey: key.trim() }),
      clearOpenRouterApiKey: () => set({ openRouterApiKey: '' }),

      modelSelection: DEFAULT_MODEL_SELECTION,
      setModelFor: (role, modelId) =>
        set((state) => ({
          modelSelection: { ...state.modelSelection, [role]: modelId },
        })),

      // ── Live Scratchpad ──────────────────────────────────────────────
      scratchpad: [],
      addToScratchpad: (text) =>
        set((state) => ({
          scratchpad: [
            ...state.scratchpad,
            {
              id: `sp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              text: text.trim(),
              timestamp: Date.now(),
            },
          ],
        })),
      clearScratchpad: () => set({ scratchpad: [] }),

      // ── UI flags ────────────────────────────────────────────────────
      isListening: false,
      setIsListening: (listening) => set({ isListening: listening }),
    }),
    {
      name: 'vita-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist everything except the ephemeral UI flags.
      partialize: (state) => ({
        openRouterApiKey: state.openRouterApiKey,
        modelSelection: state.modelSelection,
        scratchpad: state.scratchpad,
      }),
    },
  ),
);
