import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { apiKey } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'No API key provided' }, { status: 400 });
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://rag-research-assistant.local',
        'X-Title': 'MSc Research Assistant',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-8b-instruct:free',
        messages: [{ role: 'user', content: 'Say "OK" only.' }],
        max_tokens: 10,
      }),
    });

    if (response.status === 429) {
      return NextResponse.json({ status: 'rate-limited', message: 'Key is valid but currently rate-limited' });
    }

    if (response.status === 401 || response.status === 403) {
      return NextResponse.json({ status: 'invalid', message: 'Invalid API key' });
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return NextResponse.json({ status: 'error', message: `API error: ${response.status}` });
    }

    return NextResponse.json({ status: 'valid', message: 'API key is working correctly' });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', message: error instanceof Error ? error.message : 'Connection failed' },
      { status: 500 }
    );
  }
}
