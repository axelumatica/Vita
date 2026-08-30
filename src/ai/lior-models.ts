// Lior Brain — OpenRouter free models. Use ONLY free-tier.
// Best current free for conversational: google/gemini-2.0-flash-exp:free (fast, natural tone)
// Fallback for structured JSON extraction: meta-llama/llama-3.1-8b-instruct:free
// Deep reasoning (debug/arch): deepseek/deepseek-r1:free
// Never send to paid endpoints; these are $0 per request, up to 1000/day via your 10€ access tier.

export const LIOR_MODELS = [
  { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2 Flash (free)', bestFor: 'Lior conversation — fastest, natural, 200ms latency' },
  { id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Llama 3.1 8B (free)', bestFor: 'Task extraction / JSON / structured output' },
  { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1 (free)', bestFor: 'Reasoning / debug / architecture questions' },
];

export const DEFAULT_LIOR_MODEL = 'google/gemini-2.0-flash-exp:free';
