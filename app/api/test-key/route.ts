import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { apiKey } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'No API key provided' }, { status: 400 });
    }

    const isGroq = apiKey.startsWith('gsk_');
    const isGemini = apiKey.startsWith('AIza');
    
    let apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
    if (isGroq) {
      apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    } else if (isGemini) {
      apiUrl = `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions?key=${apiKey}`;
    }
    
    let model = 'meta-llama/llama-3.3-70b-instruct:free';
    if (isGroq) model = 'llama-3.3-70b-versatile';
    else if (isGemini) model = 'gemini-1.5-flash';

    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          ...(isGroq || isGemini ? {} : {
            'HTTP-Referer': 'https://rag-research-assistant.local',
            'X-Title': 'MSc Research Assistant',
          })
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Say "OK" only.' }],
          max_tokens: 10,
        }),
      });

      if (res.ok) {
        return NextResponse.json({ status: 'valid', message: 'API key is working correctly' });
      }

      const errorBody = await res.json().catch(() => ({}));
      const errorStatus = res.status;

      if (errorStatus === 429) {
        return NextResponse.json({
          status: 'rate-limited',
          message: 'Key is valid but currently rate-limited'
        });
      }

      if (errorStatus === 401 || errorStatus === 403) {
        return NextResponse.json({ status: 'invalid', message: 'Invalid API key' });
      }

      return NextResponse.json({
        status: 'error',
        message: `API error: ${errorBody?.error?.message || errorBody?.message || res.statusText}`
      });
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
