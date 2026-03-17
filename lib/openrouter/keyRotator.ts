import { ApiKey } from '@/types';

export class KeyRotator {
  private keys: ApiKey[];
  private currentIndex: number;

  constructor(keys: ApiKey[]) {
    this.keys = keys;
    this.currentIndex = 0;
  }

  private isKeyAvailable(key: ApiKey): boolean {
    if (key.status === 'error') return false;
    if (key.status === 'rate-limited') {
      if (key.rateLimitedUntil && Date.now() > key.rateLimitedUntil) {
        key.status = 'active';
        return true;
      }
      return false;
    }
    return true;
  }

  getCurrentKey(): ApiKey | null {
    const available = this.keys.filter((k) => this.isKeyAvailable(k));
    if (available.length === 0) return null;

    for (let i = 0; i < this.keys.length; i++) {
      const idx = (this.currentIndex + i) % this.keys.length;
      if (this.isKeyAvailable(this.keys[idx])) {
        this.currentIndex = idx;
        return this.keys[idx];
      }
    }
    return null;
  }

  markRateLimited(keyId: string): void {
    const key = this.keys.find((k) => k.id === keyId);
    if (key) {
      key.status = 'rate-limited';
      key.rateLimitedUntil = Date.now() + 60 * 1000;
      this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    }
  }

  markError(keyId: string): void {
    const key = this.keys.find((k) => k.id === keyId);
    if (key) {
      key.status = 'error';
      this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    }
  }

  markSuccess(keyId: string): void {
    const key = this.keys.find((k) => k.id === keyId);
    if (key) {
      key.status = 'active';
      key.lastUsed = Date.now();
    }
  }

  getStats(): { total: number; active: number; rateLimited: number; errored: number } {
    return {
      total: this.keys.length,
      active: this.keys.filter((k) => k.status === 'active').length,
      rateLimited: this.keys.filter((k) => k.status === 'rate-limited').length,
      errored: this.keys.filter((k) => k.status === 'error').length,
    };
  }

  updateKeys(keys: ApiKey[]): void {
    this.keys = keys;
    this.currentIndex = 0;
  }
}

export async function callOpenRouter(
  messages: Array<{ role: string; content: string }>,
  model: string,
  keys: ApiKey[],
  currentKeyIndex: number,
  onKeyRotate?: (newIndex: number, keyId: string, reason: string) => void
): Promise<{ content: string; usedKeyId: string; model: string; newIndex: number }> {
  const rotator = new KeyRotator(keys);
  rotator['currentIndex'] = currentKeyIndex;

  const maxRetries = keys.length;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const key = rotator.getCurrentKey();
    if (!key) {
      throw new Error(
        'All API keys are exhausted or rate-limited. Please add more keys or wait for rate limits to reset.'
      );
    }

    try {
      // 1. Detect provider from the key prefix
      const isGroqKey   = key.key.startsWith('gsk_');
      const isGeminiKey = key.key.startsWith('AIza');
      
      // 2. Determine API URL and Headers based on the KEY
      let apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
      if (isGroqKey) {
        apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
      } else if (isGeminiKey) {
        // Gemini's OpenAI-compatible endpoint often works better with the key in the URL
        apiUrl = `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions?key=${key.key}`;
      }
      
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${key.key}`,
        'Content-Type': 'application/json',
      };

      if (!isGroqKey && !isGeminiKey) {
        headers['HTTP-Referer'] = 'https://rag-research-assistant.local';
        headers['X-Title'] = 'MSc Research Assistant';
      }

      // 3. Clean up the model ID and map if necessary
      let cleanModel = model;
      
      if (isGroqKey) {
        cleanModel = model.replace('groq/', '');
      } else if (isGeminiKey) {
        // Strip prefix and use standard IDs for Gemini endpoint
        const rawModel = model.replace('gemini/', '');
        const modelMap: Record<string, string> = {
          'gemini-2.0-flash': 'gemini-2.0-flash',
          'gemini-1.5-flash': 'gemini-1.5-flash',
          'gemini-1.5-pro':   'gemini-1.5-pro',
        };
        cleanModel = modelMap[rawModel] || rawModel;
      } else {
        // Handle OpenRouter mapping (it needs the provider prefix)
        if (model.startsWith('groq/')) {
          const modelMap: Record<string, string> = {
            'groq/llama-3.3-70b-versatile': 'meta-llama/llama-3.3-70b-instruct',
            'groq/llama-3.1-70b-versatile': 'meta-llama/llama-3.1-70b-instruct',
            'groq/mixtral-8x7b-32768':      'mistralai/mixtral-8x7b-instruct',
          };
          cleanModel = modelMap[model] || model.replace('groq/', 'meta-llama/');
        } else if (model.startsWith('gemini/')) {
          const modelMap: Record<string, string> = {
            'gemini/gemini-2.0-flash': 'google/gemini-2.0-flash-001',
            'gemini/gemini-1.5-flash': 'google/gemini-flash-1.5',
            'gemini/gemini-1.5-pro':   'google/gemini-pro-1.5',
          };
          cleanModel = modelMap[model] || model.replace('gemini/', 'google/');
        }
      }

      console.log(`[KeyRotator] Calling ${isGeminiKey ? 'Gemini' : isGroqKey ? 'Groq' : 'OpenRouter'} with model: ${cleanModel}`);

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: cleanModel,
          messages,
          temperature: 0.1,
          max_tokens: 4096,
          stream: false,
        }),
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        const errorMessage: string =
          errorBody?.error?.message || errorBody?.message || res.statusText;

        if (res.status === 429) {
          rotator.markRateLimited(key.id);
          onKeyRotate?.(rotator['currentIndex'], key.id, 'rate-limited');
          continue;
        }

        if (res.status === 401 || res.status === 403) {
          rotator.markError(key.id);
          onKeyRotate?.(rotator['currentIndex'], key.id, 'auth-error');
          continue;
        }

        throw new Error(`${isGroqKey ? 'Groq' : 'OpenRouter'} API error: ${errorMessage}`);
      }

      const data = await res.json();
      rotator.markSuccess(key.id);

      return {
        content: data.choices?.[0]?.message?.content || '',
        usedKeyId: key.id,
        model: data.model || model,
        newIndex: rotator['currentIndex'],
      };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (error.message?.startsWith('OpenRouter API error:')) {
        throw error;
      }
      // Network/fetch errors — try next key
      rotator.markError(key.id);
      onKeyRotate?.(rotator['currentIndex'], key.id, 'network-error');
    }
  }

  throw new Error('All API keys failed. Please check your API keys and try again.');
}