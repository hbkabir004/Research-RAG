
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { query, apiKey } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'No query provided' }, { status: 400 });
    }

    // Use provided API key or fallback to environment variable
    const serperKey = apiKey || process.env.SERPER_API_KEY;

    if (!serperKey) {
      return NextResponse.json({ error: 'Serper API key not configured. Please add it in Settings.' }, { status: 401 });
    }

    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': serperKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        num: 8, // Fetch top 8 results for better RAG context
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ error: errorData.message || 'Search API failed' }, { status: response.status });
    }

    const data = await response.json();
    
    // Process and curate results
    const results = (data.organic || []).map((item: any) => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      source: new URL(item.link).hostname,
    }));

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('Web Search Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
