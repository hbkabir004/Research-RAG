
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    
    try {
      await fs.access(envPath);
    } catch {
      return NextResponse.json({ keys: [] });
    }

    const content = await fs.readFile(envPath, 'utf8');
    const lines = content.split('\n');
    const keys: Array<{ key: string; label: string; id: string; type?: string }> = [];

    let currentLabel = '';
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Parse comment labels
      if (trimmedLine.startsWith('# Added on') && trimmedLine.includes('(Label:')) {
        const match = trimmedLine.match(/\(Label: (.*?)\)/);
        if (match) currentLabel = match[1];
        continue;
      }

      // Parse key lines
      if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.includes('=')) {
        const [varName, value] = trimmedLine.split('=');
        if (value && (varName.includes('API_KEY') || varName.includes('SERPER_API_KEY'))) {
          keys.push({
            key: value.trim(),
            label: currentLabel || varName.trim(),
            id: `env_${varName.trim()}_${Math.random().toString(36).slice(2, 6)}`,
            type: varName.includes('SERPER') ? 'serper' : 'llm'
          });
          currentLabel = ''; // Reset for next key
        }
      }
    }

    return NextResponse.json({ keys });
  } catch (error: any) {
    console.error('Load keys API error:', error);
    return NextResponse.json({ error: 'Failed to load keys' }, { status: 500 });
  }
}
