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
      const isGroq = model.startsWith('groq/');
      const apiUrl = isGroq 
        ? 'https://api.groq.com/openai/v1/chat/completions'
        : 'https://openrouter.ai/api/v1/chat/completions';
      
      const cleanModel = isGroq ? model.replace('groq/', '') : model;

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key.key}`,
          'Content-Type': 'application/json',
          ...(isGroq ? {} : {
            'HTTP-Referer': 'https://rag-research-assistant.local',
            'X-Title': 'MSc Research Assistant',
          })
        },
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

        throw new Error(`${isGroq ? 'Groq' : 'OpenRouter'} API error: ${errorMessage}`);
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