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

    // Find next available key starting from currentIndex
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
      key.rateLimitedUntil = Date.now() + 60 * 1000; // 1 minute cooldown
      // Advance to next key
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
}

export async function callOpenRouter(
  messages: Array<{ role: string; content: string }>,
  model: string,
  keys: ApiKey[],
  currentKeyIndex: number,
  onKeyRotate?: (newIndex: number, keyId: string, reason: string) => void
): Promise<{ content: string; usedKeyId: string; model: string }> {
  const rotator = new KeyRotator(keys);
  rotator['currentIndex'] = currentKeyIndex;

  const maxRetries = keys.length;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const key = rotator.getCurrentKey();
    if (!key) {
      throw new Error('All API keys are exhausted or rate-limited. Please add more keys or wait for rate limits to reset.');
    }

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key.key}`,
          'HTTP-Referer': 'https://rag-research-assistant.local',
          'X-Title': 'MSc Research Assistant',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.7,
          max_tokens: 4096,
          stream: false,
        }),
      });

      if (response.status === 429) {
        rotator.markRateLimited(key.id);
        onKeyRotate?.(rotator['currentIndex'], key.id, 'rate-limited');
        continue;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401 || response.status === 403) {
          rotator.markError(key.id);
          onKeyRotate?.(rotator['currentIndex'], key.id, 'auth-error');
          continue;
        }
        throw new Error(`OpenRouter API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      rotator.markSuccess(key.id);

      return {
        content: data.choices[0]?.message?.content || '',
        usedKeyId: key.id,
        model: data.model || model,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('OpenRouter API error')) {
        throw error;
      }
      rotator.markError(key.id);
      onKeyRotate?.(rotator['currentIndex'], key.id, 'network-error');
    }
  }

  throw new Error('All API keys failed. Please check your API keys and try again.');
}
