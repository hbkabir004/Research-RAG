import { ApiKey } from '@/types';
import { OpenRouter } from '@openrouter/sdk';

export class KeyRotator {
  private keys: ApiKey[];
  private currentIndex: number;
  private sdkClients: Map<string, OpenRouter>;

  constructor(keys: ApiKey[]) {
    this.keys = keys;
    this.currentIndex = 0;
    this.sdkClients = new Map();
    this.initializeClients();
  }

  private initializeClients(): void {
    for (const key of this.keys) {
      if (!this.sdkClients.has(key.id)) {
        const client = new OpenRouter({
          apiKey: key.key,
          httpReferer: 'https://rag-research-assistant.local',
          xTitle: 'MSc Research Assistant',
        });
        this.sdkClients.set(key.id, client);
      }
    }
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

  getSDKClient(keyId: string): OpenRouter | null {
    return this.sdkClients.get(keyId) || null;
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

  updateKeys(keys: ApiKey[]): void {
    this.keys = keys;
    this.currentIndex = 0;
    this.initializeClients();
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
      throw new Error('All API keys are exhausted or rate-limited. Please add more keys or wait for rate limits to reset.');
    }

    const client = rotator.getSDKClient(key.id);
    if (!client) {
      rotator.markError(key.id);
      onKeyRotate?.(rotator['currentIndex'], key.id, 'client-error');
      continue;
    }

    try {
      const response = await (client.chat.send as any)({
        model,
        messages: messages as Array<{ role: 'system' | 'user' | 'assistant' | 'developer'; content: string }>,
        chatGenerationParams: {
          temperature: 0.1,
          max_tokens: 4096,
          stream: false,
        }
      });

      // Mark success and return
      rotator.markSuccess(key.id);

      return {
        content: response.choices?.[0]?.message?.content || '',
        usedKeyId: key.id,
        model: response.model || model,
        newIndex: rotator['currentIndex'],
      };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      // Handle different error types from SDK
      const errorStatus = error?.status || error?.statusCode;

      if (errorStatus === 429 || error?.error?.type === 'rate_limit_error') {
        rotator.markRateLimited(key.id);
        onKeyRotate?.(rotator['currentIndex'], key.id, 'rate-limited');
        continue;
      }

      if (errorStatus === 401 || errorStatus === 403 || error?.error?.type === 'authentication_error') {
        rotator.markError(key.id);
        onKeyRotate?.(rotator['currentIndex'], key.id, 'auth-error');
        continue;
      }

      // For other errors, throw immediately (these are likely request format errors)
      throw new Error(`OpenRouter API error: ${error.message || errorStatus || 'Unknown error'}`);
    }
  }

  throw new Error('All API keys failed. Please check your API keys and try again.');
}
