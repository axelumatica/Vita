/**
 * src/store/vita-store.ts
 *
 * Single Zustand store with persist middleware.
 * Persists to AsyncStorage under the key 'vita-store'.
 *
 * This is the full data model for Vita. Every screen reads from this store.
 *
 * Core entities (matching the SQLite schema in THEPROMPT.txt §7):
 *   - VaultEntry: typed records (TASK / DIARY / VOICE / NOTE) that survive
 *     past the staging area.
 *   - TaskStep: micro-steps decomposed from a TASK entry.
 *   - ProjectCluster: AI-identified project groupings (future auto-cluster).
 *   - focusTaskId: the ONE active focus task (max 1, by spec).
 *
 * Anti-hallucination invariant: nothing in vaultEntries[] came from the AI
 * without explicit user confirmation. The LiorScreen's scratchpad is the
 * staging area; the "Confirm all" flow moves items into vaultEntries[].
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { VoiceProfileId } from '../ai/voice-profiles';
import { getVoiceProfile } from '../ai/voice-profiles';

// ─────────────────────────────────────────────────────────────────────────────
//  ID helper
// ─────────────────────────────────────────────────────────────────────────────

/** Generate a short, sortable, unique-enough id without a uuid dep. */
function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Entity types
// ─────────────────────────────────────────────────────────────────────────────

/** The four canonical entry types. Determines icon, color, default routing. */
export type VaultEntryType = 'TASK' | 'DIARY' | 'VOICE' | 'NOTE';

/** A single stored record. */
export interface VaultEntry {
  id: string;
  type: VaultEntryType;
  /** Short title (auto-generated for TASKs, first line for DIARYs, etc.) */
  title: string;
  /** Full body text. For DIARY/VOICE this is the user's exact words. */
  content: string;
  createdAt: number;
  updatedAt: number;
  isArchived: boolean;
  /** Optional AI-assigned project cluster. Set only via auto-cluster or user action. */
  projectClusterId: string | null;
  /** Free-form tags (e.g. "#overload", "#work", "#home"). */
  tags: string[];
  /** Confidence score from extraction, 0–1. 1 for user-authored entries. */
  confidence: number;
  /** True if Lior's extraction confidence was below TASK_CONFIDENCE_GATE. */
  isLowConfidence: boolean;
}

/** A single micro-step belonging to a TASK entry. */
export interface TaskStep {
  id: string;
  parentTaskId: string;
  step: string;
  isCompleted: boolean;
  order: number;
}

/** A group of related entries Lior has clustered as a "project". */
export interface ProjectCluster {
  id: string;
  clusterName: string;
  confidenceScore: number;
  createdAt: number;
}

/** A staged item in the Live Scratchpad before user confirmation. */
export interface ScratchpadEntry {
  id: string;
  text: string;
  timestamp: number;
}

// ─────────────────────────────────────────────────────────────────────────────
//  UI / settings types
// ─────────────────────────────────────────────────────────────────────────────

/** Which OpenRouter model to use for each Lior subsystem. */
export interface LiorModelSelection {
  chat: string;
  extract: string;
  breakdown: string;
}

export type ThemeMode = 'dark' | 'light';

/** Lior persona — Italian-first, non-negotiable. Stored as a string in case
 *  the user wants to add a custom note. */
export interface LiorPersona {
  systemPrompt: string;
  /** Short display name the user can edit (e.g. "Lior", "Lia", "L"). */
  displayName: string;
  /** True = use the embedded default persona. False = use customPrompt. */
  useDefault: boolean;
}

/** Mood/persona mode that controls both the AI behavior and the TTS voice.
 *  Maps 1:1 to the voice profile gender×mood combinations.
 *  pipeline.ts reads this at call time to load the correct persona file
 *  (hot-reload, no caching).
 */
export type PersonaMode = 'friendly' | 'seductive' | 'mean';

/** Gender selects the Edge TTS neural voice (Isabella or Diego). */
export type VoiceGender = 'female' | 'male';

// ─────────────────────────────────────────────────────────────────────────────
//  Store shape
// ─────────────────────────────────────────────────────────────────────────────

export interface VitaStore {
  // ── OpenRouter integration ──────────────────────────────────────────
  openRouterApiKey: string;
  setOpenRouterApiKey: (key: string) => void;
  clearOpenRouterApiKey: () => void;

  modelSelection: LiorModelSelection;
  setModelFor: (role: keyof LiorModelSelection, modelId: string) => void;

  // ── Vault entries ───────────────────────────────────────────────────
  vaultEntries: VaultEntry[];
  addEntry: (entry: Omit<VaultEntry, 'id' | 'createdAt' | 'updatedAt'>) => VaultEntry;
  updateEntry: (id: string, patch: Partial<VaultEntry>) => void;
  archiveEntry: (id: string) => void;
  deleteEntry: (id: string) => void;
  linkEntryToProject: (entryId: string, projectId: string) => void;

  // ── Task steps ──────────────────────────────────────────────────────
  taskSteps: TaskStep[];
  addTaskSteps: (parentTaskId: string, steps: Array<{ step: string; order: number }>) => void;
  toggleTaskStep: (stepId: string) => void;
  clearTaskSteps: (parentTaskId: string) => void;

  // ── Live Scratchpad (staging area) ─────────────────────────────────
  scratchpad: ScratchpadEntry[];
  addToScratchpad: (text: string) => ScratchpadEntry;
  removeFromScratchpad: (id: string) => void;
  clearScratchpad: () => void;

  // ── Project clusters ────────────────────────────────────────────────
  projectClusters: ProjectCluster[];
  addProjectCluster: (name: string, confidenceScore: number) => ProjectCluster;
  removeProjectCluster: (id: string) => void;

  // ── Focus (the one active task) ─────────────────────────────────────
  focusTaskId: string | null;
  setFocusTask: (taskId: string | null) => void;

  // ── UI / persona / theme ────────────────────────────────────────────
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;

  lowStimulus: boolean;
  setLowStimulus: (on: boolean) => void;

  wasOnboarded: boolean;
  setWasOnboarded: (on: boolean) => void;

  persona: LiorPersona;
  setPersona: (persona: Partial<LiorPersona>) => void;

  // ── Persona mode (AI behavior + TTS voice) ─────────────────────────
  /** Active mood/persona mode. Read by pipeline.ts at call time. */
  personaMode: PersonaMode;
  setPersonaMode: (mode: PersonaMode) => void;

  /** Active gender for TTS voice selection. */
  voiceGender: VoiceGender;
  setVoiceGender: (gender: VoiceGender) => void;

  /** Active voice profile id. Derived from voiceGender + personaMode, but
   *  settable directly for custom profiles (secret unlock). */
  voiceProfileId: VoiceProfileId;
  setVoiceProfileId: (id: VoiceProfileId) => void;

  /** Custom persona prompt for the secret unlock feature (future). */
  customPersonaPrompt: string;
  setCustomPersonaPrompt: (prompt: string) => void;

  /** Secret unlock flag for custom personas (future). */
  customPersonaUnlocked: boolean;
  unlockCustomPersona: () => void;

  isListening: boolean;
  setIsListening: (listening: boolean) => void;

  // ── Wins this week (ADHD-friendly, no streaks) ─────────────────────
  /** A "win" is any completed micro-step or a TASK archived/finished.
   *  Tracked with timestamps so we can count wins per ISO week. */
  winsLog: { id: string; timestamp: number; kind: 'step' | 'task'; label: string }[];
  recordWin: (kind: 'step' | 'task', label: string) => void;
  /** Returns wins in the current ISO week (Mon–Sun). */
  winsThisWeek: () => number;

  // ── Debug ───────────────────────────────────────────────────────────
  resetAll: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Defaults
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_MODEL_SELECTION: LiorModelSelection = {
  chat: 'google/gemini-2.0-flash-exp:free',
  extract: 'meta-llama/llama-3.1-8b-instruct:free',
  breakdown: 'deepseek/deepseek-r1:free',
};

/** Default persona — must match LIOR_PERSONA in lior-models.ts. Kept in
 *  store as the source of truth at runtime so VoiceSettingsScreen can
 *  surface it for the user to read/edit. */
const DEFAULT_PERSONA_PROMPT = `Sei Lior, il compagno AI integrato in Vita. La tua identità, i tuoi confini e il tuo stile comunicativo sono fissi e non negoziabili.

1. IDENTITÀ E TONO ADATTIVO
- Persona: un compagno moderno, altamente competente, che unisce precisione chirurgica a presenza amica.
- Tono: calmante, caldo, chiaro, diretto. Zero fuffa, zero gergo clinico, zero lodi condiscendenti.
- Adattabilità:
  · Se l'utente sta sfogandosi o è sopraffatto: risposte brevi, empatiche, a basso stimolo.
  · Se l'utente ha bisogno di organizzarsi: sii chirurgico, pragmatico, scomponi subito l'azione.

2. REGOLE DI ESECUZIONE ADHD
- Non presentare mai paragrafi lunghi, non formattati, o elenchi opprimenti.
- Metti in evidenza i punti chiave in grassetto, in apertura.
- Non forzare mai decisioni. Presenta una sola micro-scelta alla volta.
- Rispetta il focus dell'utente: quando estrai task, applica rigorosamente la regola "Literal First" (estrai solo verbi d'azione espliciti). Non inventare task, non diagnosticare stati emotivi.

3. TRASPARENZA E INFRASTRUTTURA
- Dichiara chiaramente che l'elaborazione avviene tramite il Cloud Proxy crittografato (OpenRouter).
- Non mentire mai sulle capacità del sistema, non effettuare fallback silenziosi.

4. LINGUA
- Rispondi sempre in italiano, a meno che l'utente non scriva chiaramente in un'altra lingua.`;

const DEFAULT_PERSONA: LiorPersona = {
  systemPrompt: DEFAULT_PERSONA_PROMPT,
  displayName: 'Lior',
  useDefault: true,
};

const DEFAULT_PERSONA_MODE: PersonaMode = 'friendly';
const DEFAULT_VOICE_GENDER: VoiceGender = 'female';
const DEFAULT_VOICE_PROFILE_ID: VoiceProfileId = 'female-friendly';

// ─────────────────────────────────────────────────────────────────────────────
//  Store
// ─────────────────────────────────────────────────────────────────────────────

export const useVitaStore = create<VitaStore>()(
  persist(
    (set, get) => ({
      // ── OpenRouter integration ──────────────────────────────────────
      openRouterApiKey: '',
      setOpenRouterApiKey: (key) => set({ openRouterApiKey: key.trim() }),
      clearOpenRouterApiKey: () => set({ openRouterApiKey: '' }),

      modelSelection: DEFAULT_MODEL_SELECTION,
      setModelFor: (role, modelId) =>
        set((state) => ({
          modelSelection: { ...state.modelSelection, [role]: modelId },
        })),

      // ── Vault entries ───────────────────────────────────────────────
      vaultEntries: [],
      addEntry: (draft) => {
        const now = Date.now();
        const entry: VaultEntry = {
          id: makeId('ve'),
          createdAt: now,
          updatedAt: now,
          ...draft,
        };
        set((state) => ({ vaultEntries: [entry, ...state.vaultEntries] }));
        return entry;
      },
      updateEntry: (id, patch) =>
        set((state) => ({
          vaultEntries: state.vaultEntries.map((e) =>
            e.id === id ? { ...e, ...patch, updatedAt: Date.now() } : e,
          ),
        })),
      archiveEntry: (id) =>
        set((state) => ({
          vaultEntries: state.vaultEntries.map((e) =>
            e.id === id ? { ...e, isArchived: true, updatedAt: Date.now() } : e,
          ),
        })),
      deleteEntry: (id) =>
        set((state) => ({
          vaultEntries: state.vaultEntries.filter((e) => e.id !== id),
          // If the deleted entry was the focus, clear focus.
          focusTaskId: state.focusTaskId === id ? null : state.focusTaskId,
          // Cascade-delete its micro-steps.
          taskSteps: state.taskSteps.filter((s) => s.parentTaskId !== id),
        })),
      linkEntryToProject: (entryId, projectId) =>
        set((state) => ({
          vaultEntries: state.vaultEntries.map((e) =>
            e.id === entryId ? { ...e, projectClusterId: projectId } : e,
          ),
        })),

      // ── Task steps ──────────────────────────────────────────────────
      taskSteps: [],
      addTaskSteps: (parentTaskId, steps) =>
        set((state) => {
          // Replace any existing steps for this task.
          const filtered = state.taskSteps.filter((s) => s.parentTaskId !== parentTaskId);
          const newSteps: TaskStep[] = steps.map((s) => ({
            id: makeId('ts'),
            parentTaskId,
            step: s.step,
            order: s.order,
            isCompleted: false,
          }));
          return { taskSteps: [...filtered, ...newSteps] };
        }),
      toggleTaskStep: (stepId) =>
        set((state) => ({
          taskSteps: state.taskSteps.map((s) =>
            s.id === stepId ? { ...s, isCompleted: !s.isCompleted } : s,
          ),
        })),
      clearTaskSteps: (parentTaskId) =>
        set((state) => ({
          taskSteps: state.taskSteps.filter((s) => s.parentTaskId !== parentTaskId),
        })),

      // ── Live Scratchpad ──────────────────────────────────────────────
      scratchpad: [],
      addToScratchpad: (text) => {
        const entry: ScratchpadEntry = {
          id: makeId('sp'),
          text: text.trim(),
          timestamp: Date.now(),
        };
        set((state) => ({ scratchpad: [...state.scratchpad, entry] }));
        return entry;
      },
      removeFromScratchpad: (id) =>
        set((state) => ({
          scratchpad: state.scratchpad.filter((s) => s.id !== id),
        })),
      clearScratchpad: () => set({ scratchpad: [] }),

      // ── Project clusters ────────────────────────────────────────────
      projectClusters: [],
      addProjectCluster: (clusterName, confidenceScore) => {
        const cluster: ProjectCluster = {
          id: makeId('pc'),
          clusterName,
          confidenceScore,
          createdAt: Date.now(),
        };
        set((state) => ({ projectClusters: [...state.projectClusters, cluster] }));
        return cluster;
      },
      removeProjectCluster: (id) =>
        set((state) => ({
          projectClusters: state.projectClusters.filter((c) => c.id !== id),
          // Unlink any entries that pointed to this cluster.
          vaultEntries: state.vaultEntries.map((e) =>
            e.projectClusterId === id ? { ...e, projectClusterId: null } : e,
          ),
        })),

      // ── Focus (one task) ────────────────────────────────────────────
      focusTaskId: null,
      setFocusTask: (taskId) => {
        // Enforce the "max 1" rule from the spec.
        if (taskId !== null) {
          const entry = get().vaultEntries.find((e) => e.id === taskId);
          if (!entry || entry.type !== 'TASK') return;
        }
        set({ focusTaskId: taskId });
      },

      // ── UI / persona / theme ────────────────────────────────────────
      themeMode: 'dark',
      setThemeMode: (mode) => set({ themeMode: mode }),

      lowStimulus: false,
      setLowStimulus: (on) => set({ lowStimulus: on }),

      wasOnboarded: false,
      setWasOnboarded: (on) => set({ wasOnboarded: on }),

      persona: DEFAULT_PERSONA,
      setPersona: (patch) =>
        set((state) => ({ persona: { ...state.persona, ...patch } })),

      personaMode: DEFAULT_PERSONA_MODE,
      setPersonaMode: (mode) =>
        set((state) => {
          const profile = getVoiceProfile(state.voiceGender, mode);
          return { personaMode: mode, voiceProfileId: profile.id };
        }),

      voiceGender: DEFAULT_VOICE_GENDER,
      setVoiceGender: (gender) =>
        set((state) => {
          const profile = getVoiceProfile(gender, state.personaMode);
          return { voiceGender: gender, voiceProfileId: profile.id };
        }),

      voiceProfileId: DEFAULT_VOICE_PROFILE_ID,
      setVoiceProfileId: (id) => set({ voiceProfileId: id }),

      customPersonaPrompt: '',
      setCustomPersonaPrompt: (prompt) => set({ customPersonaPrompt: prompt }),

      customPersonaUnlocked: false,
      unlockCustomPersona: () => set({ customPersonaUnlocked: true }),

      isListening: false,
      setIsListening: (listening) => set({ isListening: listening }),

      // ── Wins this week (ADHD-friendly, no streaks) ──────────────────
      winsLog: [],
      recordWin: (kind, label) =>
        set((state) => ({
          winsLog: [
            ...state.winsLog,
            {
              id: makeId('win'),
              timestamp: Date.now(),
              kind,
              label: label.slice(0, 60),
            },
          ],
        })),
      winsThisWeek: () => {
        const log = get().winsLog;
        const now = new Date();
        // ISO week start (Monday) at 00:00 local time.
        const day = (now.getDay() + 6) % 7; // 0 = Mon
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - day);
        weekStart.setHours(0, 0, 0, 0);
        const startMs = weekStart.getTime();
        return log.filter((w) => w.timestamp >= startMs).length;
      },

      // ── Debug ───────────────────────────────────────────────────────
      resetAll: () =>
        set({
          vaultEntries: [],
          taskSteps: [],
          projectClusters: [],
          focusTaskId: null,
          scratchpad: [],
          themeMode: 'dark',
          lowStimulus: false,
          persona: DEFAULT_PERSONA,
          personaMode: DEFAULT_PERSONA_MODE,
          voiceGender: DEFAULT_VOICE_GENDER,
          voiceProfileId: DEFAULT_VOICE_PROFILE_ID,
          customPersonaPrompt: '',
          customPersonaUnlocked: false,
          winsLog: [],
        }),
    }),
    {
      name: 'vita-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist everything except the ephemeral UI flags.
      partialize: (state) => {
        // Strip any non-serializable / non-persisted fields.
        const { isListening: _isListening, resetAll: _resetAll, ...rest } = state;
        return rest;
      },
      // Version the persisted shape so we can migrate later.
      version: 4,
    },
  ),
);
