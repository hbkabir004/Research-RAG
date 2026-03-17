import { callOpenRouter } from '@/lib/openrouter/keyRotator';
import { ApiKey } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      messages,
      model,
      apiKeys,
      currentKeyIndex,
      systemPrompt,
    }: {
      messages: Array<{ role: string; content: string }>;
      model: string;
      apiKeys: ApiKey[];
      currentKeyIndex: number;
      systemPrompt: string;
    } = body;

    if (!apiKeys || apiKeys.length === 0) {
      return NextResponse.json(
        { error: 'No API keys configured. Please add OpenRouter API keys in Settings.' },
        { status: 400 }
      );
    }

    // Reset any client-side error/rate-limit statuses — the server validates
    // keys fresh on every request, so stale frontend state should not block calls.
    const freshKeys: ApiKey[] = apiKeys.map((k) => ({
      ...k,
      status: 'active' as const,
      rateLimitedUntil: undefined,
    }));

    const messagesWithSystem = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    const result = await callOpenRouter(
      messagesWithSystem,
      model || 'meta-llama/llama-3.3-8b-instruct:free',
      freshKeys,
      currentKeyIndex ?? 0
    );

    return NextResponse.json({
      content: result.content,
      usedKeyId: result.usedKeyId,
      model: result.model,
      newIndex: result.newIndex,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
}