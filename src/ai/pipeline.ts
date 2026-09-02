/**
 * src/ai/pipeline.ts
 *
 * Lior's brain. One module, three operations:
 *
 *   chat(messages, apiKey)
 *     Open-ended, persona-grounded conversation. Drives the LiorScreen live
 *     scratchpad and the "Help me think" / "Reread my dump" shortcuts.
 *
 *   extractTasks(rawDump, apiKey)
 *     Turns a free-form voice dump into two structured buckets: tasks and
 *     diary reflections. Applies the Literal First rule (only explicit action
 *     verbs become tasks) and the 0.9 confidence gate (below = neutral note).
 *     The result lands in the Scratchpad staging area, not directly in the Vault.
 *
 *   breakdownTask(taskTitle, apiKey)
 *     Takes a vague or multi-step parent task and returns an array of atomic
 *     micro-steps (≤ 2 minutes each, max 5 steps). Used by TasksScreen's
 *     "Riduci ancora" button and by the breakdown engine on first capture.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * All calls go through OpenRouter (https://openrouter.ai/docs). The API key
 * is stored in the Zustand store (set by the user in VoiceSettingsScreen).
 * The store key is `vita-store`; the pipeline never hard-codes credentials.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Anti-hallucination architecture:
 *   - Nothing writes to the Vault without explicit user confirmation.
 *   - Below TASK_CONFIDENCE_GATE (0.9) → diary entry, never an invented task.
 *   - No creative summaries: diary reflections preserve the user's exact words.
 *   - No silent model fallback: on API errors the caller receives a typed error,
 *     never a degraded response that looks like success.
 */

import {
  LIOR_MODELS,
  defaultModelFor,
  PROCESSING_DISCLOSURE,
  TASK_CONFIDENCE_GATE,
  MAX_MICRO_STEPS,
  MICRO_STEP_TARGET_SECONDS,
  BREAKDOWN_INPUT_CHAR_BUDGET,
  LiorTask,
} from './lior-models';

// Hot-reload persona loader: reads personaMode + voiceGender from Zustand
// store at every call. Replaces the static LIOR_PERSONA import.
import { getActivePersonaOrDefault } from './persona-loader';

// ─────────────────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────────────────

/** A single extracted micro-step, ready for the Zustand taskSteps[] array. */
export interface MicroStep {
  step: string;
  order: number;
}

/**
 * A single extracted item from a voice dump.
 * `isDiary: false`  → confirmed task (confidence ≥ 0.9).
 * `isDiary: true`   → diary reflection OR low-confidence task (≤ 0.9).
 */
export interface ExtractedItem {
  title: string;
  /** The raw text segment this was extracted from — never rewritten by the LLM. */
  rawSource: string;
  isDiary: boolean;
  confidence: number;
}

/** The complete result of a voice dump pass through the extractor. */
export interface ExtractionResult {
  items: ExtractedItem[];
  /** True if the model flagged overload / paralysis language. */
  overloadDetected: boolean;
}

/** A single turn in the Lior chat history. */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ─────────────────────────────────────────────────────────────────────────────
//  OpenRouter HTTP client
// ─────────────────────────────────────────────────────────────────────────────

const OR_BASE = 'https://openrouter.ai/api/v1' as const;

interface OrChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OrResponse {
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage?: { total_tokens: number; prompt_tokens: number; completion_tokens: number };
  error?: { code: string; message: string };
}

/**
 * Core HTTP call to OpenRouter. Sends a messages array, receives a parsed
 * assistant string. Throws a typed LiorError on any transport or API error
 * so callers never accidentally treat a failure as a valid response.
 */
async function orChat(
  messages: OrChatMessage[],
  apiKey: string,
  modelId: string,
  temperature: number,
  maxTokens: number,
): Promise<string> {
  if (!apiKey || apiKey.trim() === '') {
    throw new LiorError(
      'NO_API_KEY',
      'OpenRouter API key not configured. Set it in VoiceSettingsScreen.',
    );
  }

  const res = await fetch(`${OR_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      // Optional but recommended: tell OpenRouter what app is making the request.
      'HTTP-Referer': 'vita-app',
      'X-Title': 'Vita — ADHD Companion',
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      // OpenRouter surfaces errors in the JSON body.
      const json: OrResponse = await res.json();
      detail = json.error?.message ?? `${res.status} ${res.statusText}`;
    } catch {
      // Body was not JSON — use status text.
    }
    throw new LiorError('HTTP_ERROR', `OpenRouter request failed: ${detail}`);
  }

  const json: OrResponse = await res.json();

  if (!json.choices || json.choices.length === 0) {
    throw new LiorError('EMPTY_RESPONSE', 'OpenRouter returned no choices.');
  }

  return json.choices[0]!.message.content ?? '';
}

// ─────────────────────────────────────────────────────────────────────────────
//  Error type
// ─────────────────────────────────────────────────────────────────────────────

/** Typed errors from the pipeline. `code` is a machine-readable slug. */
export class LiorError extends Error {
  readonly code: LiorErrorCode;
  constructor(code: LiorErrorCode, message: string) {
    super(message);
    this.name = 'LiorError';
    this.code = code;
  }
}

/** Discriminated error codes so callers can handle specific failures. */
export type LiorErrorCode =
  | 'NO_API_KEY'        // User hasn't configured OpenRouter in settings.
  | 'HTTP_ERROR'        // Network failure or non-2xx response from OpenRouter.
  | 'EMPTY_RESPONSE'    // Model returned no content.
  | 'PARSE_ERROR'       // Model output was not valid JSON where we expected it.
  | 'BREAKDOWN_TOO_LONG'; // Input text exceeds BREAKDOWN_INPUT_CHAR_BUDGET.

// ─────────────────────────────────────────────────────────────────────────────
//  1.  TASK EXTRACTION
// ─────────────────────────────────────────────────────────────────────────────

const EXTRACT_SYSTEM = `${PROCESSING_DISCLOSURE}

You are a strict extraction engine. You NEVER invent tasks or diagnose emotions.
Your ONLY job is to sort sentences from a voice dump into two buckets.

**Bucket A — TASK (isDiary: false)**
Extract ONLY when the sentence contains an explicit action verb in Italian
("devo", "farò", "ricordami", "comprare", "chiamare", "inviare", etc.)
AND expresses a concrete, doable intention. Confidence must be ≥ 0.9 to go here.
Below 0.9 → always Bucket B instead.

**Bucket B — DIARY (isDiary: true)**
Everything else: emotions, doubts, reflections, observations, or
low-confidence "maybe tasks". Keep the user's exact words — never rewrite them.

Return a JSON object (no markdown, no explanation):
{
  "items": [
    {
      "title": "Exact sentence as spoken, or a 3-word title for a confirmed task.",
      "rawSource": "The exact text segment this was extracted from.",
      "isDiary": true or false,
      "confidence": 0.0 to 1.0
    }
  ],
  "overloadDetected": true if the dump contains overload / paralysis markers
  ("troppo", "non ce la faccio", "sono bloccato", "sovraccarico", "ansia",
   rapid fragmented speech, etc.), otherwise false.
}

Rules:
- Preserve exact spoken phrasing in every diary entry. Zero creative summaries.
- If a sentence has no action verb, it is ALWAYS a diary entry.
- If a task is too vague to become a concrete action, mark it isDiary=true.
- Output valid JSON. No text outside the JSON object.` as const;

/** Parse the raw model output into ExtractionResult. Throws on invalid JSON. */
function parseExtractionResult(raw: string): ExtractionResult {
  try {
    const parsed = JSON.parse(raw) as {
      items?: unknown;
      overloadDetected?: unknown;
    };

    if (!Array.isArray(parsed.items)) {
      throw new Error('Missing or invalid "items" field');
    }

    const items: ExtractedItem[] = parsed.items.map((item) => {
      if (typeof item !== 'object' || item === null) throw new Error('Item is not an object');
      const { title, rawSource, isDiary, confidence } = item as Record<string, unknown>;
      if (typeof title !== 'string' || !title.trim()) throw new Error('Item missing "title"');
      return {
        title: (title as string).trim(),
        rawSource: typeof rawSource === 'string' ? rawSource.trim() : (title as string).trim(),
        isDiary: Boolean(isDiary),
        confidence: typeof confidence === 'number' ? confidence : 0,
      };
    });

    return {
      items,
      overloadDetected: Boolean(parsed.overloadDetected),
    };
  } catch (err) {
    throw new LiorError(
      'PARSE_ERROR',
      `Extraction model returned unparseable JSON: ${err instanceof Error ? err.message : raw}`,
    );
  }
}

/**
 * Process a raw voice dump through the task extractor.
 *
 * Returns an `ExtractionResult` with zero or more items classified as task or
 * diary. Items are NOT written to the store — they land in the Scratchpad
 * staging area inside the LiorScreen, where the user confirms or discards them.
 *
 * @param rawDump        Raw text from the voice-to-text pass. Can be multi-line.
 * @param apiKey         OpenRouter API key from the Zustand store.
 * @param modelId        Override the default extractor model (Llama 3.1 8B).
 *                       Pass null/undefined to use the catalog default.
 */
export async function extractTasks(
  rawDump: string,
  apiKey: string,
  modelId?: string,
): Promise<ExtractionResult> {
  const model = modelId
    ? LIOR_MODELS.find((m) => m.id === modelId) ?? defaultModelFor('extract')
    : defaultModelFor('extract');

  const userMessage = rawDump.slice(0, 2000);

  const raw = await orChat(
    [
      { role: 'system', content: EXTRACT_SYSTEM },
      { role: 'user', content: userMessage },
    ],
    apiKey,
    model.id,
    model.temperature,
    model.maxTokens,
  );

  return parseExtractionResult(raw);
}

// ─────────────────────────────────────────────────────────────────────────────
//  2.  TASK BREAKDOWN (Micro-Steps)
// ─────────────────────────────────────────────────────────────────────────────

const BREAKDOWN_SYSTEM = `${PROCESSING_DISCLOSURE}

You are a task decomposition engine. You ONLY break down ONE task at a time.
Every step you return MUST be completable in ${MICRO_STEP_TARGET_SECONDS / 60} minutes or less
by a person acting alone, without needing decisions, research, or external input.

Rules:
- Return between 1 and ${MAX_MICRO_STEPS} steps.
- Each step starts with a physical, concrete verb in Italian ("Apri", "Scrivi",
  "Clicca", "Invia", "Porta", "Controlla").
- No step should require another decision — the user just does it.
- If the input task is already a single atomic action, return exactly 1 step.
- Do NOT add motivational language, emojis, or explanations.

Return a JSON object (no markdown):
{
  "steps": [
    { "step": "Apri il documento del report", "order": 1 },
    { "step": "Scrivi i 3 punti chiave", "order": 2 }
  ]
}` as const;

/** Parse the breakdown model output into MicroStep[]. Throws on invalid JSON. */
function parseBreakdownResult(raw: string): MicroStep[] {
  try {
    const parsed = JSON.parse(raw) as { steps?: unknown };
    if (!Array.isArray(parsed.steps)) {
      throw new Error('Missing or invalid "steps" field');
    }
    return parsed.steps.map((s, i) => {
      if (typeof s !== 'object' || s === null) throw new Error(`steps[${i}] is not an object`);
      const { step, order } = s as Record<string, unknown>;
      if (typeof step !== 'string' || !step.trim()) {
        throw new Error(`steps[${i}] missing "step"`);
      }
      return {
        step: (step as string).trim(),
        order: typeof order === 'number' ? order : i + 1,
      };
    });
  } catch (err) {
    throw new LiorError(
      'PARSE_ERROR',
      `Breakdown model returned unparseable JSON: ${err instanceof Error ? err.message : raw}`,
    );
  }
}

/**
 * Decompose a parent task into ≤2-minute micro-steps.
 *
 * @param taskTitle    The task to break down. Should be the vault entry title.
 * @param apiKey       OpenRouter API key.
 * @param modelId      Override the default breakdown model (DeepSeek R1).
 *                     Pass null/undefined to use the catalog default.
 * @returns MicroStep[] ordered by execution sequence (order 1 → N).
 */
export async function breakdownTask(
  taskTitle: string,
  apiKey: string,
  modelId?: string,
): Promise<MicroStep[]> {
  if (taskTitle.length > BREAKDOWN_INPUT_CHAR_BUDGET) {
    throw new LiorError(
      'BREAKDOWN_TOO_LONG',
      `Task title exceeds ${BREAKDOWN_INPUT_CHAR_BUDGET} characters. Truncate before calling breakdown.`,
    );
  }

  const model = modelId
    ? LIOR_MODELS.find((m) => m.id === modelId) ?? defaultModelFor('breakdown')
    : defaultModelFor('breakdown');

  const raw = await orChat(
    [
      { role: 'system', content: BREAKDOWN_SYSTEM },
      { role: 'user', content: taskTitle },
    ],
    apiKey,
    model.id,
    model.temperature,
    model.maxTokens,
  );

  return parseBreakdownResult(raw);
}

// ─────────────────────────────────────────────────────────────────────────────
//  3.  CHAT (Persona-grounded conversation)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One-shot chat with the Lior persona.
 *
 * Pass the current conversation history (user + assistant turns). The persona
 * system prompt is prepended automatically — callers do NOT pass it in messages.
 *
 * Use this for:
 *   - "Help me think" (Socratic single-question grounding)
 *   - "Reread my dump" (neutral emotional mirror in one sentence)
 *   - Live conversation in the LiorScreen scratchpad
 *
 * For streaming live transcription with incremental LLM output, callers should
 * use `streamChat` which yields text chunks incrementally as they arrive from
 * OpenRouter.
 *
 * @param messages     Array of chat turns, newest last. Does NOT include the
 *                    system prompt — that is injected here.
 * @param apiKey      OpenRouter API key.
 * @param modelId     Override the default chat model (Gemini 2.0 Flash).
 *                    Pass null/undefined to use the catalog default.
 */
export async function chat(
  messages: ChatMessage[],
  apiKey: string,
  modelId?: string,
): Promise<string> {
  const model = modelId
    ? LIOR_MODELS.find((m) => m.id === modelId) ?? defaultModelFor('chat')
    : defaultModelFor('chat');

  // Build the OpenRouter message array. Inject the persona as a system message.
  const orMessages: OrChatMessage[] = [
    { role: 'system', content: `${PROCESSING_DISCLOSURE}\n\n${getActivePersonaOrDefault()}` },
    ...messages.map((m): OrChatMessage => ({
      role: m.role,
      content: m.content,
    })),
  ];

  return orChat(
    orMessages,
    apiKey,
    model.id,
    model.temperature,
    model.maxTokens,
  );
}

/**
 * Streaming chat with the Lior persona.
 *
 * Same as `chat()` but yields text chunks incrementally so callers can
 * show a typing/streaming indicator while Lior's response arrives.
 * Callers should read the generator until completion; the accumulated
 * text is the full response.
 *
 * Use this for:
 *   - Live conversation in LiorScreen where you want to show the model
 *     typing incrementally rather than waiting for the full response.
 *   - "Help me think" with incremental grounding questions.
 *
 * @param messages     Array of chat turns, newest last. Does NOT include the
 *                    system prompt — that is injected here.
 * @param apiKey       OpenRouter API key.
 * @param modelId      Override the default chat model (Gemini 2.0 Flash).
 *                     Pass null/undefined to use the catalog default.
 */
export async function* streamChat(
  messages: ChatMessage[],
  apiKey: string,
  modelId?: string,
): AsyncGenerator<string, string, unknown> {
  const model = modelId
    ? LIOR_MODELS.find((m) => m.id === modelId) ?? defaultModelFor('chat')
    : defaultModelFor('chat');

  // Build the OpenRouter message array. Inject the persona as a system message.
  const orMessages: OrChatMessage[] = [
    { role: 'system', content: `${PROCESSING_DISCLOSURE}\n\n${getActivePersonaOrDefault()}` },
    ...messages.map((m): OrChatMessage => ({
      role: m.role,
      content: m.content,
    })),
  ];

  const res = await fetch(`${OR_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'vita-app',
      'X-Title': 'Vita — ADHD Companion',
      // Tell OpenRouter we want streaming NDJSON chunks.
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({
      model: model.id,
      messages: orMessages,
      temperature: model.temperature,
      max_tokens: model.maxTokens,
      stream: true,
    }),
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new LiorError(
      'HTTP_ERROR',
      `OpenRouter request failed: ${res.status} ${res.statusText}\n${json.error?.message || ''}`,
    );
  }

  // Parse the SSE / NDJSON stream that OpenRouter returns.
  const reader = res.body?.getReader();
  if (!reader) {
    throw new LiorError('EMPTY_RESPONSE', 'OpenRouter returned no readable body.');
  }

  const decoder = new TextDecoder();
  let fullContent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    // OpenRouter streams each line as "data: {json}\n\n".
    // Split on newlines and process each JSON line.
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const jsonStr = line.slice(6); // remove "data: " prefix
      if (jsonStr === '[DONE]') continue;
      try {
        const json = JSON.parse(jsonStr) as {
          choices?: Array<{
            delta?: { content?: string };
            finish_reason?: string;
          }>;
        };
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) {
          fullContent += delta;
          yield delta;
        }
        if (json.choices?.[0]?.finish_reason) {
          // Signal end of stream by yielding the empty string as sentinel.
          break;
        }
      } catch {
        // Skip malformed lines.
      }
    }
  }

  // Yield accumulated full content as the final value.
  yield fullContent;
  return fullContent;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Convenience: single-shot help-me-think (Socratic)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ask Lior for exactly ONE short grounding question, in Socratic mode.
 * Used by LiorScreen's "🧠 Help me think" button.
 *
 * Returns a single short question (~10 words) — never advice or a list.
 *
 * @param userText   What the user just said / their current thought dump.
 * @param apiKey     OpenRouter API key.
 */
export async function liorHelpMeThink(
  userText: string,
  apiKey: string,
): Promise<string> {
  const model = defaultModelFor('chat');

  const prompt = `${PROCESSING_DISCLOSURE}

${getActivePersonaOrDefault()}

The user said:
"${userText.slice(0, 800)}"

Ask exactly ONE short grounding question in Italian (~10 words maximum).
Do not give advice, a list, or a task. Only a single question.
Return only the question, no prefix, no explanation.` as const;

  return orChat(
    [{ role: 'user', content: prompt }],
    apiKey,
    model.id,
    0.3,       // Slightly warmer than extract — we're asking a question, not solving a puzzle.
    60,        // Short: just the question.
  );
}

/**
 * Ask Lior to mirror the user's emotional throughline in one neutral sentence.
 * Used by LiorScreen's "🔍 Reread my dump" button.
 *
 * Returns a single neutral sentence — no judgment, no added tasks, no
 * clinical language.
 *
 * @param userText   The raw voice dump or recent scratchpad content.
 * @param apiKey     OpenRouter API key.
 */
export async function liorRereadDump(
  userText: string,
  apiKey: string,
): Promise<string> {
  const model = defaultModelFor('chat');

  const prompt = `${PROCESSING_DISCLOSURE}

${getActivePersonaOrDefault()}

The user recently said (or dumped):
"${userText.slice(0, 800)}"

Mirror back the single emotional throughline you hear in one neutral sentence in Italian.
Do not diagnose, do not suggest tasks, do not use clinical labels.
Use the user's own words where possible.
Return only the sentence, no prefix, no explanation.` as const;

  return orChat(
    [{ role: 'user', content: prompt }],
    apiKey,
    model.id,
    0.3,
    80,
  );
}

/**
 * Run a simple clustering pass over a list of entry titles/content.
 * Groups entries that share recurring keywords/themes and returns cluster
 * suggestions with confidence scores. Used to pre-populate project clusters
 * before the user confirms/renames them.
 *
 * @param entries        Array of entry titles or short content strings.
 * @param apiKey         OpenRouter API key.
 * @returns              Array of { clusterName, confidenceScore, sample }.
 */
export async function clusterEntries(
  entries: string[],
  apiKey: string,
): Promise<{ clusterName: string; confidenceScore: number; sample: string }[]> {
  if (entries.length === 0) return [];

  const sampleEntries = entries.slice(0, 6).map((e, i) => `${i + 1}. ${e}`).join('\n');
  const userPrompt = `Group these diary/task entries into thematic project clusters.

Entries:
${sampleEntries}

For each cluster, return:
- A concise cluster name (2-5 words, in Italian if the entries are Italian)
- A confidence score 0.0 - 1.0 indicating how strongly the entries belong together
- One example entry that best represents the cluster

Return at most 3 clusters. Output ONLY valid JSON:
[
  {"clusterName": "...", "confidenceScore": 0.x, "sample": "..."}
]` as const;

  const model = defaultModelFor('chat');
  const raw = await orChat(
    [{ role: 'user', content: userPrompt }],
    apiKey,
    model.id,
    0.3,
    500,
  );

  try {
    const parsed = JSON.parse(raw) as Array<{
      clusterName: string;
      confidenceScore: number;
      sample: string;
    }>;
    return parsed.slice(0, 3);
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Diagnostics export (for VoiceSettingsScreen / debug panel)
// ─────────────────────────────────────────────────────────────────────────────

/** Current pipeline version tag. Bump on any breaking change. */
export const PIPELINE_VERSION = '1.0.0' as const;

/**
 * Lightweight model-routing table for the VoiceSettingsScreen settings UI.
 * Returns the catalog as a plain array so the UI can map over it without
 * importing the catalog directly.
 */
export function getModelCatalog() {
  return LIOR_MODELS.map((m) => ({ ...m }));
}

/**
 * Returns the default model ID for a given task role.
 * Convenience wrapper — callers that already imported `defaultModelFor`
 * don't need this, but UI screens that import only from `pipeline.ts`
 * can use it without a second import.
 */
export function defaultModelIdFor(role: LiorTask): string {
  return defaultModelFor(role).id;
}
