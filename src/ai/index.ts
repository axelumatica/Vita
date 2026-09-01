/**
 * src/ai/index.ts
 *
 * Public surface for the Lior AI module.
 * All screens and store logic should import from here, not from individual files.
 */

// Models & constants
export {
  LIOR_MODELS,
  LIOR_PERSONA,
  PROCESSING_DISCLOSURE,
  LISTENING_PROMPT,
  FIRST_GREETING,
  TASK_CONFIDENCE_GATE,
  PROJECT_CLUSTER_GATE,
  MAX_MICRO_STEPS,
  MICRO_STEP_TARGET_SECONDS,
  BREAKDOWN_INPUT_CHAR_BUDGET,
  ITALIAN_ACTION_VERBS,
  defaultModelFor,
} from './lior-models';

export type {
  LiorTask,
  LiorModel,
} from './lior-models';

// Persona loader (hot-reload)
export {
  getActivePersona,
  getActivePersonaOrDefault,
} from './persona-loader';

// Voice profiles
export {
  VOICE_PROFILES,
  getVoiceProfile,
  getVoiceProfileById,
  DEFAULT_VOICE_PROFILE,
  DEFAULT_VOICE_PROFILE_ID,
} from './voice-profiles';

export type {
  VoiceProfile,
  VoiceProfileId,
  Gender,
  Mood,
} from './voice-profiles';

// Pipeline
export {
  extractTasks,
  breakdownTask,
  chat,
  streamChat,
  liorHelpMeThink,
  liorRereadDump,
  clusterEntries,
  LiorError,
  getModelCatalog,
  defaultModelIdFor,
  PIPELINE_VERSION,
} from './pipeline';

export type {
  MicroStep,
  ExtractedItem,
  ExtractionResult,
  ChatMessage,
  LiorErrorCode,
} from './pipeline';
