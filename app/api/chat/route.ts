import { NextRequest, NextResponse } from 'next/server';
import { callOpenRouter } from '@/lib/openrouter/keyRotator';
import { ApiKey } from '@/types';

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

    const activeKeys = apiKeys.filter((k) => k.status !== 'error');
    if (activeKeys.length === 0) {
      return NextResponse.json(
        { error: 'All API keys have failed. Please check your API keys in Settings.' },
        { status: 400 }
      );
    }

    const messagesWithSystem = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    const result = await callOpenRouter(
      messagesWithSystem,
      model || 'meta-llama/llama-3.3-8b-instruct:free',
      activeKeys,
      currentKeyIndex,
      (newIndex, keyId, reason) => {
        console.log(`[Key Rotation] Rotated from key ${keyId}. Reason: ${reason}. New index: ${newIndex}`);
      }
    );

    return NextResponse.json({
      content: result.content,
      usedKeyId: result.usedKeyId,
      model: result.model,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
}
