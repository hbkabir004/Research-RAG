import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.txt', '.md', '.markdown', '.pptx', '.ppt'];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lastSync = 0 } = body;

    const documentsDir = join(process.cwd(), 'public', 'documents');

    // Check if documents directory exists
    if (!existsSync(documentsDir)) {
      return NextResponse.json({
        hasChanges: false,
        message: 'Documents directory not found',
      });
    }

    const files = await readdir(documentsDir);
    let hasChanges = false;
    const fileChanges: Array<{ name: string; lastModified: number; action: 'added' | 'modified' | 'deleted' }> = [];

    // Check for new or modified files
    for (const file of files) {
      const ext = '.' + file.split('.').pop()?.toLowerCase();

      if (!SUPPORTED_EXTENSIONS.includes(ext)) {
        continue;
      }

      const filePath = join(documentsDir, file);
      const stats = await stat(filePath);

      if (stats.mtime.getTime() > lastSync) {
        hasChanges = true;
        fileChanges.push({
          name: file,
          lastModified: stats.mtime.getTime(),
          action: 'added',
        });
      }
    }

    return NextResponse.json({
      hasChanges,
      changes: fileChanges,
      lastSyncTime: Date.now(),
    });
  } catch (error) {
    console.error('Error syncing documents:', error);
    return NextResponse.json(
      {
        error: 'Failed to sync documents',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
