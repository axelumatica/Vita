import { useStore } from '../store/vita-store';
import { DEFAULT_LIOR_MODEL } from './lior-models';

export type ExtractionResult = {
  tasks: Array<{ title: string; confidence: number; requires_confirmation: boolean }>;
  journal_reflections: Array<{ text: string; confidence: number }>;
  emotion_tags?: string[];
  energy_tag?: 'low' | 'medium' | 'high' | 'overwhelmed';
};

export type LiorResponse = {
  text: string;
  type: 'response' | 'extracted_task' | 'emotional_reflection' | 'micro_step';
  extracted_data?: ExtractionResult;
};

const LIOR_SYSTEM_PROMPT = `Sei Lior, un compagno AI per persone con ADHD. Sei una presenza abile, mai un chatbot generico.
- Non diagnostichi, non giudichi, non fai lodi condescendenti.
- Estrai task SOLO da verbi d'azione espliciti ("devo", "ricordami", "farò").
- Sotto 90% confidenza → nota neutra, MAI task inventati.
- Risposte brevi: max 2 frasi. Mai paragrafi lunghi.
- Front-loada il punto principale. Usa bullet points per micro-steps.
- Le parole dell'utente restano verbatim — non riformularle mai.
- Rispondi nella stessa lingua dell'utente, di default italiano.
- Dichiari sempre lo stato: locale vs cloud proxy.`;

export interface OpenRouterPipeline {
  extract(text: string): Promise<ExtractionResult | null>;
  converse(messages: Array<{ role: string; content: string }>): Promise<LiorResponse | null>;
  isConfigured(): boolean;
  getStatus(): 'local' | 'remote' | 'unavailable';
}

export class OpenRouterPipelineImpl implements OpenRouterPipeline {
  private apiKey: string | null = null;
  private model: string = DEFAULT_LIOR_MODEL;
  private storeState: ReturnType<typeof useStore.getState>;

  constructor(storeState: ReturnType<typeof useStore.getState>) {
    this.storeState = storeState;
    // In a real app, you would read the API key from a secure store or environment variable.
    // For now, we set it to null to use the local fallback.
    this.apiKey = null;
    this.model = storeState.liorModel;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  getStatus(): 'local' | 'remote' | 'unavailable' {
    if (!this.apiKey) return 'local';
    return 'remote';
  }

  async extract(text: string): Promise<ExtractionResult | null> {
    if (!this.apiKey) return this.localExtract(text);

    const prompt = [
      'Tu sei Lior, un esperto assistente per ADHD.',
      'Estrai SEMPRE in questo formato JSON stretto. Non aggiungere testo altrove.',
      'Regole anti-hallucination:',
      '1. Task = SOLO verbi d azione espliciti ("devo comprare", "ricordami di chiamare").',
      '2. Emotion/reflections SENZA azione sono Journal, NON Task.',
      '3. Confidence sotto 90% → salva come nota neutra, NON come task.',
      '4. Mantieni le parole esatte dell utente.',
      'Testo da analizzare: """' + text + '"""',
      'Risposta JSON (solo questo, niente altro):',
      '{',
      '  "tasks": [{"title": string, "confidence": number, "requires_confirmation": boolean}],',
      '  "journal_reflections": [{"text": string, "confidence": number}],',
      '  "emotion_tags": string[],',
      '  "energy_tag": "low" | "medium" | "high" | "overwhelmed"',
      '}',
    ].join('\n');

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + this.apiKey,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://vita.app',
          'X-Title': 'Vita',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: LIOR_SYSTEM_PROMPT },
            { role: 'user', content: prompt },
          ],
          temperature: 0.1,
          max_tokens: 2048,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        if (response.status === 429) return this.localExtract(text);
        console.warn('OpenRouter extract error:', err.error?.message || response.status);
        return this.localExtract(text);
      }

      const data = await response.json();
      const content: string = data.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return JSON.parse(content);
    } catch (error) {
      console.warn('OpenRouter extract failed, using local fallback:', error);
      return this.localExtract(text);
    }
  }

  async converse(
    messages: Array<{ role: string; content: string }>
  ): Promise<LiorResponse | null> {
    if (!this.apiKey) return this.localResponse(messages[messages.length - 1]?.content || '');

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + this.apiKey,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://vita.app',
          'X-Title': 'Vita',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'system', content: LIOR_SYSTEM_PROMPT }, ...messages],
          temperature: 0.3,
          max_tokens: 2048,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        if (response.status === 429) return this.localResponse(messages[messages.length - 1]?.content || '');
        console.warn('OpenRouter converse error:', err.error?.message || response.status);
        return this.localResponse(messages[messages.length - 1]?.content || '');
      }

      const data = await response.json();
      const text: string = data.choices?.[0]?.message?.content || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const extracted = JSON.parse(jsonMatch[0]);
        return {
          text: text.replace(jsonMatch[0], '').trim() || 'Estratto.',
          type: 'extracted_task',
          extracted_data: extracted,
        };
      }

      return { text, type: 'response' };
    } catch (error) {
      console.warn('OpenRouter converse failed, using local fallback:', error);
      return this.localResponse(messages[messages.length - 1]?.content || '');
    }
  }

  // Local fallbacks — no API key required
  private localExtract(text: string): ExtractionResult {
    const lower = text.toLowerCase();
    const tasks: ExtractionResult['tasks'] = [];
    const reflections: ExtractionResult['journal_reflections'] = [];

    const actionPatterns = [
      /(?:devo|devi|farò|faro|ricordami di|ho bisogno di)\s+(.+)/gi,
    ];
    let taskFound = false;
    for (const pattern of actionPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        tasks.push({ title: match[1].trim(), confidence: 0.85, requires_confirmation: true });
        taskFound = true;
      }
    }

    const emotionTags: string[] = [];
    if (/ansa|preoccup|stress|sovraccarico|tropp?o/i.test(lower)) emotionTags.push('sovraccarico');
    if (/stanc|esaust|debole|bassa energia/i.test(lower)) emotionTags.push('bassa energia');
    if (/bene|contento|ok|meglio/i.test(lower)) emotionTags.push('positivo');

    if (!taskFound) {
      reflections.push({ text, confidence: 0.75 });
    }

    const energyTag: ExtractionResult['energy_tag'] =
      emotionTags.includes('bassa energia') ? 'low'
      : emotionTags.includes('sovraccarico') ? 'overwhelmed'
      : 'medium';

    return { tasks, journal_reflections: reflections, emotion_tags: emotionTags, energy_tag: energyTag };
  }

  private localResponse(text: string): LiorResponse {
    const lower = text.toLowerCase();
    if (/^(?:ciao|hey|salve)/i.test(lower)) {
      return { text: "Ciao. Dillo pure — sono qui per ascoltarti.", type: 'response' };
    }
    if (/ansa|stress|sovra/i.test(lower)) {
      return { text: "Fermiamoci un momento. Respira. Cosa ti pesa di più adesso?", type: 'response' };
    }
    if (/grazie|ok|perfetto/i.test(lower)) {
      return { text: "Di nulla. Sono qui quando ti servirà.", type: 'response' };
    }
    return {
      text: "Capisco. Possiamo trasformarlo in un passo concreto da due minuti?",
      type: 'response',
    };
  }
}

export const createPipeline = (
  storeState: ReturnType<typeof useStore.getState>
): OpenRouterPipeline => {
  return new OpenRouterPipelineImpl(storeState);
};