/**
 * src/services/backup.ts
 *
 * Backup & restore for the Vita vault.
 *
 * Produces a single self-describing JSON document containing:
 *   - schema version (for forward-compat migrations)
 *   - export timestamp
 *   - app version snapshot
 *   - all vault data + settings
 *
 * Designed for ADHD-friendly use:
 *   - one tap to export
 *   - paste-anywhere flow (clipboard, share sheet, file save)
 *   - import is forgiving: validates, reports issues, never silent-overwrites
 *
 * Privacy: backup is local-only by default. The user explicitly shares it
 * (clipboard, share sheet, file). No cloud sync.
 */

import { Platform, Share, Clipboard } from 'react-native';
import { useVitaStore } from '../store/vita-store';

/** Bumped on any breaking schema change. Imports with older versions are
 *  accepted but flagged. */
export const BACKUP_SCHEMA_VERSION = 1 as const;

/** App version snapshot at export time. */
const APP_VERSION = '0.1.0';

export interface VitaBackup {
  schema: typeof BACKUP_SCHEMA_VERSION;
  exportedAt: number;
  appVersion: string;
  platform: 'ios' | 'android' | 'web' | 'unknown';
  data: {
    vaultEntries: unknown[];
    taskSteps: unknown[];
    projectClusters: unknown[];
    scratchpad: unknown[];
    persona: unknown;
    personaMode: string;
    voiceGender: string;
    voiceProfileId: string;
    themeMode: string;
    lowStimulus: boolean;
    customPersonaPrompt: string;
    customPersonaUnlocked: boolean;
  };
  /** Stats: how much was backed up, useful for "X entries, Y steps" summary. */
  stats: {
    entries: number;
    tasks: number;
    diary: number;
    notes: number;
    voice: number;
    steps: number;
    clusters: number;
    scratchpad: number;
  };
}

interface ImportResult {
  ok: boolean;
  /** Human-readable Italian message for the UI. */
  message: string;
  /** Counts if import succeeded, so the UI can show "restored X entries". */
  restored?: {
    entries: number;
    steps: number;
    clusters: number;
  };
  /** Validation issues (non-fatal) — e.g. schema older than current. */
  warnings?: string[];
}

interface ImportOptions {
  /** When true, the current store is REPLACED by the backup.
   *  When false (default), entries are merged by id (newest wins). */
  replace?: boolean;
}

/** Build a backup from current store state. */
export function buildBackup(): VitaBackup {
  const state = useVitaStore.getState();
  const entries = state.vaultEntries;
  const stats = {
    entries: entries.length,
    tasks: entries.filter((e) => e.type === 'TASK').length,
    diary: entries.filter((e) => e.type === 'DIARY').length,
    notes: entries.filter((e) => e.type === 'NOTE').length,
    voice: entries.filter((e) => e.type === 'VOICE').length,
    steps: state.taskSteps.length,
    clusters: state.projectClusters.length,
    scratchpad: state.scratchpad.length,
  };
  return {
    schema: BACKUP_SCHEMA_VERSION,
    exportedAt: Date.now(),
    appVersion: APP_VERSION,
    platform: (Platform.OS as 'ios' | 'android' | 'web') ?? 'unknown',
    data: {
      vaultEntries: state.vaultEntries,
      taskSteps: state.taskSteps,
      projectClusters: state.projectClusters,
      scratchpad: state.scratchpad,
      persona: state.persona,
      personaMode: state.personaMode,
      voiceGender: state.voiceGender,
      voiceProfileId: state.voiceProfileId,
      themeMode: state.themeMode,
      lowStimulus: state.lowStimulus,
      customPersonaPrompt: state.customPersonaPrompt,
      customPersonaUnlocked: state.customPersonaUnlocked,
    },
    stats,
  };
}

/** Serialize backup to a human-readable JSON string. Pretty-printed for
 *  easy inspection in any text editor. */
export function backupToJson(backup: VitaBackup): string {
  return JSON.stringify(backup, null, 2);
}

/**
 * Show the system share sheet with the backup as a text file.
 * On iOS/Android the user can save to Files, Drive, AirDrop, etc.
 * On web, this falls back to a clipboard copy (web share is gated).
 */
export async function shareBackup(backup: VitaBackup): Promise<{ method: 'share' | 'clipboard'; size: number }> {
  const json = backupToJson(backup);
  const filename = `vita-backup-${formatDateForFilename(backup.exportedAt)}.json`;

  // Try Share API first (native share sheet)
  if (Platform.OS !== 'web' && typeof Share?.share === 'function') {
    try {
      await Share.share({
        title: 'Vita backup',
        message: json,
      });
      return { method: 'share', size: json.length };
    } catch {
      // Fall through to clipboard
    }
  }

  // Fallback: copy to clipboard (works everywhere)
  try {
    Clipboard.setString(json);
    return { method: 'clipboard', size: json.length };
  } catch {
    // Last resort: throw with friendly guidance
    throw new Error(
      `Non sono riuscita a salvare il backup negli appunti (${json.length} caratteri). Copia manualmente questo testo e salvalo come "${filename}" in un archivio.`,
    );
  }
}

function formatDateForFilename(ts: number): string {
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${hh}${mi}`;
}

/** Parse a JSON string into a backup candidate. Throws on invalid JSON. */
export function parseBackupJson(json: string): VitaBackup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    throw new Error('JSON non valido. Assicurati di aver copiato l\'intero backup.');
  }
  return validateBackup(parsed);
}

function validateBackup(parsed: unknown): VitaBackup {
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Backup non valido: non è un oggetto.');
  }
  const p = parsed as Record<string, unknown>;
  if (typeof p.schema !== 'number') {
    throw new Error('Backup non valido: manca il numero di schema.');
  }
  if (typeof p.data !== 'object' || p.data === null) {
    throw new Error('Backup non valido: manca la sezione data.');
  }
  const d = p.data as Record<string, unknown>;
  if (!Array.isArray(d.vaultEntries)) {
    throw new Error('Backup non valido: vaultEntries mancante o non è un array.');
  }
  if (!Array.isArray(d.taskSteps)) {
    throw new Error('Backup non valido: taskSteps mancante o non è un array.');
  }
  if (!Array.isArray(d.projectClusters)) {
    throw new Error('Backup non valido: projectClusters mancante o non è un array.');
  }
  return parsed as VitaBackup;
}

/** Import a parsed backup into the store. */
export function importBackup(backup: VitaBackup, opts: ImportOptions = {}): ImportResult {
  const warnings: string[] = [];
  if (backup.schema < BACKUP_SCHEMA_VERSION) {
    warnings.push(`Schema backup (${backup.schema}) più vecchio di quello attuale (${BACKUP_SCHEMA_VERSION}). Alcuni campi potrebbero essere mancanti.`);
  }
  if (backup.schema > BACKUP_SCHEMA_VERSION) {
    warnings.push(`Schema backup (${backup.schema}) più nuovo di quello attuale. Alcuni campi potrebbero essere ignorati.`);
  }
  if (backup.appVersion !== APP_VERSION) {
    warnings.push(`Versione app diversa: backup da ${backup.appVersion}, attuale ${APP_VERSION}.`);
  }

  const state = useVitaStore.getState();
  const data = backup.data;

  if (opts.replace) {
    // Full replace
    useVitaStore.setState({
      vaultEntries: data.vaultEntries as any,
      taskSteps: data.taskSteps as any,
      projectClusters: data.projectClusters as any,
      scratchpad: data.scratchpad as any,
      persona: data.persona as any,
      personaMode: data.personaMode as any,
      voiceGender: data.voiceGender as any,
      voiceProfileId: data.voiceProfileId as any,
      themeMode: data.themeMode as any,
      lowStimulus: data.lowStimulus,
      customPersonaPrompt: data.customPersonaPrompt,
      customPersonaUnlocked: data.customPersonaUnlocked,
    });
  } else {
    // Merge: newest-wins by id for collections, full replace for settings
    const mergeById = <T extends { id: string }>(current: T[], incoming: T[]): T[] => {
      const map = new Map<string, T>();
      for (const item of current) map.set(item.id, item);
      for (const item of incoming) map.set(item.id, item);
      return Array.from(map.values());
    };

    useVitaStore.setState({
      vaultEntries: mergeById(state.vaultEntries, data.vaultEntries as any),
      taskSteps: mergeById(state.taskSteps, data.taskSteps as any),
      projectClusters: mergeById(state.projectClusters, data.projectClusters as any),
      scratchpad: mergeById(state.scratchpad, data.scratchpad as any),
      // Settings: import wins
      persona: data.persona as any,
      personaMode: data.personaMode as any,
      voiceGender: data.voiceGender as any,
      voiceProfileId: data.voiceProfileId as any,
      themeMode: data.themeMode as any,
      lowStimulus: data.lowStimulus,
      customPersonaPrompt: data.customPersonaPrompt,
      customPersonaUnlocked: data.customPersonaUnlocked,
    });
  }

  const restored = {
    entries: data.vaultEntries.length,
    steps: data.taskSteps.length,
    clusters: data.projectClusters.length,
  };

  const verb = opts.replace ? 'ripristinati' : 'uniti';
  return {
    ok: true,
    message: `Backup ${verb}: ${restored.entries} entry, ${restored.steps} micro-step, ${restored.clusters} cluster.`,
    restored,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
