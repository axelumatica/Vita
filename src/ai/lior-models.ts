/**
 * src/ai/lior-models.ts
 *
 * Model catalog + persona definition for the Lior engine.
 *
 * This file is the static "brain schema" — no I/O, no fetch, no side effects.
 * The actual HTTP client lives in ./pipeline.ts. Keeping these separate means
 * the persona string and model list can be unit-tested, swapped at runtime by
 * the VoiceSettingsScreen, and audited by humans without touching the pipeline.
 *
 * Wireframe reference: see vita-wireframe.html "Free OpenRouter model routing"
 *   - Lior conversational voice  → google/gemini-2.0-flash-exp:free
 *   - Task extraction / strict JSON → meta-llama/llama-3.1-8b-instruct:free
 *   - Reasoning / heavy breakdown  → deepseek/deepseek-r1:free
 *
 * Anti-hallucination thresholds (also referenced in pipeline.ts):
 *   - 0.9 confidence gate: anything below becomes a neutral note, NOT a task.
 *   - 0.8 project-cluster gate: above = auto-cluster, below = ask inline.
 */

// ────────────────────────────────────────────────────────────────────────────
//  Types
// ────────────────────────────────────────────────────────────────────────────

/** Which subsystem inside Lior is asking the model. Drives model routing. */
export type LiorTask =
  | 'chat'         // open-ended voice/text conversation
  | 'extract'      // task / diary extraction from a free-form dump
  | 'breakdown'    // decompose a parent task into ≤2-min micro-steps
  | 'reflect';     // neutral reread: reflect the user's emotional throughline

/**
 * A model entry in the Lior catalog. The `id` is the OpenRouter slug
 * (everything after the model name in the free-tier table, with `:free`).
 * `temperature` is tuned per role: chat needs warmth/variation, extract
 * needs near-zero variance to obey the JSON schema.
 */
export interface LiorModel {
  id: string;
  label: string;
  role: LiorTask;
  temperature: number;
  /** Max output tokens to request. Conversational replies rarely need more
   *  than 200; extraction needs room for the JSON envelope around 1–5 items. */
  maxTokens: number;
  /** Human-readable rationale — surfaced in VoiceSettingsScreen. */
  why: string;
}

// ────────────────────────────────────────────────────────────────────────────
//  Catalog
// ────────────────────────────────────────────────────────────────────────────

/**
 * The shipped catalog. Order = preference order; pipeline picks the first
 * entry matching a given `LiorTask`. To swap a model without code edits,
 * the VoiceSettingsScreen will write overrides back into the Zustand store,
 * which pipeline reads at call time.
 */
export const LIOR_MODELS: readonly LiorModel[] = [
  {
    id: 'google/gemini-2.0-flash-exp:free',
    label: 'Gemini 2.0 Flash (free)',
    role: 'chat',
    temperature: 0.7,
    maxTokens: 240,
    why: 'Sub-300ms latency, natural conversational tone — fits Lior\'s "presenza abile" cadence.',
  },
  {
    id: 'meta-llama/llama-3.1-8b-instruct:free',
    label: 'Llama 3.1 8B Instruct (free)',
    role: 'extract',
    temperature: 0.1,
    maxTokens: 400,
    why: 'Reliable structured JSON at low temperature; lowest hallucination on constrained schemas.',
  },
  {
    id: 'deepseek/deepseek-r1:free',
    label: 'DeepSeek R1 (free)',
    role: 'breakdown',
    temperature: 0.2,
    maxTokens: 500,
    why: 'Strongest free reasoning model for breaking vague tasks into atomic steps.',
  },
  {
    id: 'google/gemini-2.0-flash-exp:free',
    label: 'Gemini 2.0 Flash (free)',
    role: 'reflect',
    temperature: 0.4,
    maxTokens: 120,
    why: 'Reuses the chat model with a calmer temperature for one-sentence mirror responses.',
  },
] as const;

/** Resolve the default model for a given role. Always returns the first match. */
export function defaultModelFor(role: LiorTask): LiorModel {
  const m = LIOR_MODELS.find((x) => x.role === role);
  if (!m) {
    // Defensive: the catalog is a const tuple so this should be unreachable.
    // We still throw rather than silently fall through, because a silent
    // fallback to the wrong model would violate the "disclose processing"
    // rule (user thinks they're being heard by Lior, gets the extractor).
    throw new Error(`[lior-models] No model registered for role "${role}"`);
  }
  return m;
}

// ────────────────────────────────────────────────────────────────────────────
//  Thresholds
// ────────────────────────────────────────────────────────────────────────────

/** Below this confidence, an "extracted task" is downgraded to a neutral note. */
export const TASK_CONFIDENCE_GATE = 0.9;

/** Above this, an entry is auto-clustered into a project hub. Below = ask. */
export const PROJECT_CLUSTER_GATE = 0.8;

/** Hard cap on the number of micro-steps the breakdown engine may return. */
export const MAX_MICRO_STEPS = 5;

/** Target duration of every micro-step, in seconds. The "2-minute rule". */
export const MICRO_STEP_TARGET_SECONDS = 120;

/** Soft ceiling for the input dump the breakdown engine will happily chew on. */
export const BREAKDOWN_INPUT_CHAR_BUDGET = 600;

// ────────────────────────────────────────────────────────────────────────────
//  Persona — the immutable Lior system prompt
// ────────────────────────────────────────────────────────────────────────────

/**
 * Lior's identity, tone, and ADHD execution rules. This string is sent
 * verbatim as the `system` field on every chat call. It is intentionally
 * Italian-first: the project's target user thinks in Italian, and forcing
 * a translation step through the LLM adds latency and drift.
 *
 * Do NOT edit casually — the rules below are the "non-negotiable" core.
 * To add capability, layer a second system message at call time; do not
 * mutate the persona itself.
 */
export const LIOR_PERSONA = `Sei Lior, il compagno AI integrato in Vita. La tua identità, i tuoi confini e il tuo stile comunicativo sono fissi e non negoziabili.

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
- Se un compito è troppo vago per diventare un task, rifiuta di salvarlo tale e chiedi la scomposizione.

4. LINGUA
- Rispondi sempre in italiano, a meno che l'utente non scriva chiaramente in un'altra lingua. In quel caso, mantieni il tuo tono ma adatta la lingua.` as const;

/**
 * Disclosure prefix the UI badge reads. Surfaced in the LiorScreen header
 * ("[Cloud Engine] • [Encrypted Proxy]") and prepended to the system prompt
 * so the model itself knows the user can see this — keeps the model honest
 * about its transport, in line with the persona's "no silent fallback" rule.
 */
export const PROCESSING_DISCLOSURE = '[Cloud Engine · OpenRouter]';

/** Short, low-stimulus status line shown while the user holds the mic. */
export const LISTENING_PROMPT = 'Ti ascolto…';

/** First-run greeting. Used by LiorScreen on mount. Warm, no pressure. */
export const FIRST_GREETING = 'Bentornato. Da dove partiamo oggi?';

// ────────────────────────────────────────────────────────────────────────────
//  Action-verb lexicon (Italian) for the Literal First pre-filter
// ────────────────────────────────────────────────────────────────────────────

/**
 * Lightweight client-side hint. The model is still the source of truth on
 * extraction — this list is a fast-path that lets the UI show a "task
 * detected" hint while the LLM confirms, and a guarantee that we never
 * even *consider* a sentence that has no action verb a task slot.
 *
 * Kept short on purpose: any deeper parsing belongs in the LLM, not here.
 */
export const ITALIAN_ACTION_VERBS: readonly string[] = [
  'devo', 'devi', 'deve', 'dobbiamo',
  'farò', 'fare', 'fai', 'faccio',
  'ricordami', 'ricorda', 'ricordare',
  'compra', 'comprare', 'comprerò',
  'chiama', 'chiamare', 'chiamerò',
  'scrivi', 'scrivere', 'scriverò',
  'invia', 'inviare', 'invierò',
  'paga', 'pagare', 'pagherò',
  'spedisci', 'spedire',
  'ordina', 'ordinare', 'ordinerò',
  'porta', 'portare', 'porterò',
  'finisci', 'finire', 'finirò',
  'controlla', 'controllare',
  'prepara', 'preparare', 'preparerò',
  'organizza', 'organizzare',
  'fissa', 'fissare',
  'ricordati',
] as const;
