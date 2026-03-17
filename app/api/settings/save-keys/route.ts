
import fs from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const { key, label, id } = await req.json();

    if (!key) {
      return NextResponse.json({ error: 'No API key provided' }, { status: 400 });
    }

    const envPath = path.join(process.cwd(), '.env.local');
    
    // Determine variable name based on key prefix
    let varName = 'OPENROUTER_API_KEY';
    if (key.startsWith('gsk_')) {
      varName = 'GROQ_API_KEY';
    } else if (key.startsWith('AIza')) {
      varName = 'GEMINI_API_KEY';
    }

    // Prepare the line to append
    const timestamp = new Date().toISOString();
    const suffix = Math.random().toString(36).slice(2, 6);
    const envLine = `\n# Added on ${timestamp} (Label: ${label})\n${varName}_${suffix}=${key}\n`;

    try {
      // Append to file, create if not exists
      await fs.appendFile(envPath, envLine, 'utf8');
      return NextResponse.json({ status: 'success', message: `Key saved to .env.local as ${varName}_${suffix}` });
    } catch (err) {
      console.error('Error writing to .env.local:', err);
      return NextResponse.json({ error: 'Failed to write to .env.local' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Settings API error:', error);
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}
