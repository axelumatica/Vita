import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LIOR_MODELS, DEFAULT_LIOR_MODEL } from '../ai/lior-models';

export type VaultEntry = {
  id: string;
  type: 'TASK' | 'DIARY' | 'NOTE' | 'VOICE';
  title: string;
  content_raw: string;
  content_formatted?: string;
  created_at: number;
  updated_at: number;
  is_archived: number;
  project_cluster_id?: string;
};

export type TaskStep = {
  id: string;
  parent_task_id: string;
  step_description: string;
  is_completed: number;
  execution_order: number;
};

export type ProjectCluster = {
  id: string;
  cluster_name: string;
  confidence_score: number;
  created_at: number;
};

type VitaStore = {
  // Theme
  themeMode: 'dark' | 'light';
  toggleTheme: () => void;
  setThemeMode: (mode: 'dark' | 'light') => void;

  // Lior
  liorVoice: string | null;
  setLiorVoice: (voiceId: string) => void;
  liorModel: string;
  setLiorModel: (model: string) => void;
  liorPersona: string;
  setLiorPersona: (persona: string) => void;

  // Low-stimulus
  lowStimulus: boolean;
  toggleLowStimulus: () => void;

  // Vault
  vaultEntries: VaultEntry[];
  addVaultEntry: (entry: Omit<VaultEntry, 'id' | 'created_at' | 'updated_at'>) => string;
  updateVaultEntry: (id: string, updates: Partial<VaultEntry>) => void;
  deleteVaultEntry: (id: string) => void;
  archiveVaultEntry: (id: string) => void;

  // Tasks
  taskSteps: TaskStep[];
  addTaskStep: (step: Omit<TaskStep, 'id'>) => string;
  updateTaskStep: (id: string, updates: Partial<TaskStep>) => void;
  deleteTaskStep: (id: string) => void;

  // Projects
  projectClusters: ProjectCluster[];
  addProjectCluster: (cluster: Omit<ProjectCluster, 'id' | 'created_at'>) => string;

  // Focus
  focusTaskId: string | null;
  setFocusTaskId: (id: string | null) => void;
};

const defaultPersona = `Sei Lior, un compagno AI per persone con ADHD.
Regole immutabili:
- Non sei un chatbot. Sei una presenza abile.
- Non diagnostichi, non giudichi, non fai lodi condescendenti.
- Extract tasks SOLO da verbi d'azione espliciti ("devo", "ricordami", "farò").
- Sotto 90% confidenza → nota neutra, MAI task inventati.
- Le parole dell'utente restano verbatim. Mai riassunti clinici.
- Dichiari sempre se processi via Cloud Proxy (OpenRouter).
- Una micro-azione alla volta. Mai scelte multiple.
- Riduci sempre il passo successivo a 2 minuti max.`;

export const useStore = create<VitaStore>()(
  persist(
    (set, get) => ({
      // Theme
      themeMode: 'dark',
      toggleTheme: () => set((state) => ({ themeMode: state.themeMode === 'dark' ? 'light' : 'dark' })),
      setThemeMode: (mode) => set({ themeMode: mode }),

      // Lior
      liorVoice: null,
      setLiorVoice: (voiceId) => set({ liorVoice: voiceId }),
      liorModel: DEFAULT_LIOR_MODEL,
      setLiorModel: (model) => set({ liorModel: model }),
      liorPersona: defaultPersona,
      setLiorPersona: (persona) => set({ liorPersona: persona }),

      // Low-stimulus
      lowStimulus: false,
      toggleLowStimulus: () => set((state) => ({ lowStimulus: !state.lowStimulus })),

      // Vault
      vaultEntries: [],
      addVaultEntry: (entry) => {
        const id = `v_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const now = Date.now();
        set((state) => ({
          vaultEntries: [...state.vaultEntries, { ...entry, id, created_at: now, updated_at: now }],
        }));
        return id;
      },
      updateVaultEntry: (id, updates) =>
        set((state) => ({
          vaultEntries: state.vaultEntries.map((e) =>
            e.id === id ? { ...e, ...updates, updated_at: Date.now() } : e
          ),
        })),
      deleteVaultEntry: (id) =>
        set((state) => ({ vaultEntries: state.vaultEntries.filter((e) => e.id !== id) })),
      archiveVaultEntry: (id) =>
        set((state) => ({
          vaultEntries: state.vaultEntries.map((e) =>
            e.id === id ? { ...e, is_archived: 1, updated_at: Date.now() } : e
          ),
        })),

      // Tasks
      taskSteps: [],
      addTaskStep: (step) => {
        const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        set((state) => ({ taskSteps: [...state.taskSteps, { ...step, id }] }));
        return id;
      },
      updateTaskStep: (id, updates) =>
        set((state) => ({
          taskSteps: state.taskSteps.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        })),
      deleteTaskStep: (id) =>
        set((state) => ({ taskSteps: state.taskSteps.filter((s) => s.id !== id) })),

      // Projects
      projectClusters: [],
      addProjectCluster: (cluster) => {
        const id = `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const now = Date.now();
        set((state) => ({
          projectClusters: [...state.projectClusters, { ...cluster, id, created_at: now }],
        }));
        return id;
      },

      // Focus
      focusTaskId: null,
      setFocusTaskId: (id) => set({ focusTaskId: id }),
    }),
    {
      name: 'vita-store',
      partialize: (state) => ({
        themeMode: state.themeMode,
        liorVoice: state.liorVoice,
        liorModel: state.liorModel,
        liorPersona: state.liorPersona,
        lowStimulus: state.lowStimulus,
        vaultEntries: state.vaultEntries,
        taskSteps: state.taskSteps,
        projectClusters: state.projectClusters,
        focusTaskId: state.focusTaskId,
      }),
    }
  )
);