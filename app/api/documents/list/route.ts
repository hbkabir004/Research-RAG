import { NextRequest, NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Supported document types
const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.txt', '.md', '.markdown', '.pptx', '.ppt'];

const MIME_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.markdown': 'text/markdown',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.ppt': 'application/vnd.ms-powerpoint',
};

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const skipContent = searchParams.get('skipContent') === 'true';
    const specificFile = searchParams.get('file');

    const documentsDir = join(process.cwd(), 'public', 'documents');

    // Check if documents directory exists
    if (!existsSync(documentsDir)) {
      return NextResponse.json({
        documents: [],
        message: 'Documents directory not found. Please create public/documents/ directory.',
      });
    }

    const files = await readdir(documentsDir);
    const documents = [];

    for (const file of files) {
      if (specificFile && file !== specificFile) {
        continue;
      }

      const ext = '.' + file.split('.').pop()?.toLowerCase();

      if (!SUPPORTED_EXTENSIONS.includes(ext)) {
        continue;
      }

      const filePath = join(documentsDir, file);
      const stats = require('fs').statSync(filePath);

      let base64Content = null;
      if (!skipContent) {
        // Read file and convert to base64
        const fileBuffer = await readFile(filePath);
        base64Content = fileBuffer.toString('base64');
      }

      documents.push({
        name: file,
        type: ext,
        size: stats.size,
        lastModified: stats.mtime.getTime(),
        mimeType: MIME_TYPES[ext] || 'application/octet-stream',
        content: base64Content,
      });
    }

    return NextResponse.json({
      documents,
      count: documents.length,
    });
  } catch (error) {
    console.error('Error listing documents:', error);
    return NextResponse.json(
      {
        error: 'Failed to list documents',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
