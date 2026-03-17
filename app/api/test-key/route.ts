import { NextRequest, NextResponse } from 'next/server';
import { OpenRouter } from '@openrouter/sdk';

export async function POST(req: NextRequest) {
  try {
    const { apiKey } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'No API key provided' }, { status: 400 });
    }

    const client = new OpenRouter({
      apiKey,
      httpReferer: 'https://rag-research-assistant.local',
      xTitle: 'MSc Research Assistant',
      retryConfig: { strategy: 'none' },
    });

    try {
      const response = await client.chat.send({
        model: 'meta-llama/llama-3.3-8b-instruct:free',
        messages: [{ role: 'user', content: 'Say "OK" only.' }],
        max_tokens: 10,
      });

      return NextResponse.json({ status: 'valid', message: 'API key is working correctly' });
    } catch (error: any) {
      const errorStatus = error?.status || error?.statusCode;

      if (errorStatus === 429 || error?.error?.type === 'rate_limit_error') {
        return NextResponse.json({
          status: 'rate-limited',
          message: 'Key is valid but currently rate-limited'
        });
      }

      if (errorStatus === 401 || errorStatus === 403 || error?.error?.type === 'authentication_error') {
        return NextResponse.json({ status: 'invalid', message: 'Invalid API key' });
      }

      return NextResponse.json({
        status: 'error',
        message: `API error: ${error.message || errorStatus || 'Unknown error'}`
      });
    }
  } catch (error) {
    return NextResponse.json(
      { status: 'error', message: error instanceof Error ? error.message : 'Connection failed' },
      { status: 500 }
    );
  }
}
