import { DocumentChunk, ProcessedDocument } from '@/types';
import { parsePDF } from '@/lib/parsers/pdfParser';
import { parseDOCX } from '@/lib/parsers/docxParser';
import { parseTxtFile } from '@/lib/parsers/txtParser';
import { parseMdFile } from '@/lib/parsers/mdParser';
import { parsePptxFile } from '@/lib/parsers/pptxParser';
import { getVectorStore } from './vectorStore';

export interface DocumentFile {
  name: string;
  type: 'pdf' | 'docx' | 'txt' | 'md' | 'pptx';
  size: number;
  lastModified: number;
}

export interface DirectorySyncResult {
  loaded: number;
  failed: number;
  errors: Array<{ file: string; error: string }>;
  documents: ProcessedDocument[];
}

/**
 * Parse a file based on its extension
 */
async function parseFileByType(
  file: File,
  fileType: 'pdf' | 'docx' | 'txt' | 'md' | 'pptx',
  chunkSize: number,
  chunkOverlap: number
): Promise<DocumentChunk[]> {
  switch (fileType) {
    case 'pdf':
      const pdfBuffer = await file.arrayBuffer();
      const pdfResult = await parsePDF(pdfBuffer);
      // Convert text to chunks
      return chunkTextFromContent(pdfResult.text, file.name, 'pdf', chunkSize, chunkOverlap);
    case 'docx':
      const docxBuffer = await file.arrayBuffer();
      const docxResult = await parseDOCX(docxBuffer);
      // Convert text to chunks
      return chunkTextFromContent(docxResult.text, file.name, 'docx', chunkSize, chunkOverlap);
    case 'txt':
      return parseTxtFile(file, chunkSize, chunkOverlap);
    case 'md':
      return parseMdFile(file, chunkSize, chunkOverlap);
    case 'pptx':
      return parsePptxFile(file, chunkSize, chunkOverlap);
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

/**
 * Helper function to chunk text content
 */
function chunkTextFromContent(
  text: string,
  documentName: string,
  documentType: 'pdf' | 'docx',
  chunkSize: number,
  chunkOverlap: number
): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);

  let currentChunk = '';
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length > chunkSize && currentChunk.length > 0) {
      chunks.push({
        id: `${documentName}-${chunkIndex}`,
        documentId: documentName,
        documentName,
        content: currentChunk.trim(),
        chunkIndex,
      });
      chunkIndex++;

      // Add overlap
      const overlapSentences = currentChunk.split(/[.!?]+/).slice(-Math.ceil(chunkOverlap / 100)).join('. ');
      currentChunk = overlapSentences + (overlapSentences ? '. ' : '') + paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }

  if (currentChunk.trim()) {
    chunks.push({
      id: `${documentName}-${chunkIndex}`,
      documentId: documentName,
      documentName,
      content: currentChunk.trim(),
      chunkIndex,
    });
  }

  return chunks;
}

/**
 * Get file type from filename
 */
function getFileType(filename: string): 'pdf' | 'docx' | 'txt' | 'md' | 'pptx' | null {
  const ext = filename.toLowerCase().split('.').pop();
  switch (ext) {
    case 'pdf':
      return 'pdf';
    case 'docx':
    case 'doc':
      return 'docx';
    case 'txt':
      return 'txt';
    case 'md':
    case 'markdown':
      return 'md';
    case 'pptx':
    case 'ppt':
      return 'pptx';
    default:
      return null;
  }
}

/**
 * Load documents from the public/documents directory via API
 * This function makes an API call to the server to list and process files
 */
export async function loadDocumentsFromDirectory(
  chunkSize: number = 1000,
  chunkOverlap: number = 200,
  existingDocumentNames: string[] = [],
  onProgress?: (processed: number, total: number, currentFile: string) => void
): Promise<DirectorySyncResult> {
  const result: DirectorySyncResult = {
    loaded: 0,
    failed: 0,
    errors: [],
    documents: [],
  };

  try {
    // 1. Get a list of files without content first to see what's new
    const listResponse = await fetch('/api/documents/list?skipContent=true');
    if (!listResponse.ok) throw new Error(`Failed to list documents: ${listResponse.statusText}`);
    const listData = await listResponse.json();

    if (!listData.documents || !Array.isArray(listData.documents)) {
      return result;
    }

    const vectorStore = getVectorStore();
    const newFiles = listData.documents.filter((doc: any) => !existingDocumentNames.includes(doc.name));

    if (newFiles.length === 0) return result;

    const totalFiles = newFiles.length;
    let processedCount = 0;

    // 2. Fetch and process only new files one by one to avoid memory pressure and blocking
    for (const fileMeta of newFiles) {
      processedCount++;
      if (onProgress) onProgress(processedCount, totalFiles, fileMeta.name);
      
      try {
        const fileType = getFileType(fileMeta.name);
        if (!fileType) continue;

        // Fetch full content for this specific file
        const fileResponse = await fetch(`/api/documents/list?file=${encodeURIComponent(fileMeta.name)}`);
        if (!fileResponse.ok) throw new Error(`Failed to fetch content for ${fileMeta.name}`);
        const fileData = await fileResponse.json();
        const doc = fileData.documents[0];

        if (!doc || !doc.content) continue;

        // Create a File object from the base64 content
        const content = atob(doc.content);
        const bytes = new Uint8Array(content.length);
        for (let i = 0; i < content.length; i++) {
          bytes[i] = content.charCodeAt(i);
        }

        const blob = new Blob([bytes], { type: doc.mimeType });
        const file = new File([blob], doc.name, { type: doc.mimeType });

        // Parse the file
        const chunks = await parseFileByType(file, fileType, chunkSize, chunkOverlap);

        if (chunks.length === 0) {
          result.failed++;
          result.errors.push({ file: doc.name, error: 'No content extracted' });
          continue;
        }

        // Add chunks to vector store
        vectorStore.addChunks(chunks);

        // Create processed document
        const processedDoc: ProcessedDocument = {
          id: doc.name,
          name: doc.name,
          type: fileType,
          size: doc.size,
          chunks,
          processedAt: Date.now(),
          status: 'ready',
          pageCount: doc.pageCount,
        };

        result.documents.push(processedDoc);
        result.loaded++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          file: fileMeta.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
      
      // Yield to main thread every file to prevent UI freeze
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  } catch (error) {
    result.errors.push({
      file: 'directory',
      error: error instanceof Error ? error.message : 'Failed to load documents',
    });
  }

  return result;
}

/**
 * Watch for changes in the documents directory
 */
export class DirectoryWatcher {
  private intervalId: number | null = null;
  private lastSyncTime: number = 0;
  private onChangeCallback: (result: DirectorySyncResult) => void;
  private pollInterval: number;
  private getExistingNames: () => string[];

  constructor(
    onChange: (result: DirectorySyncResult) => void,
    getExistingNames: () => string[],
    pollInterval: number = 30000 // 30 seconds default
  ) {
    this.onChangeCallback = onChange;
    this.getExistingNames = getExistingNames;
    this.pollInterval = pollInterval;
  }

  start(): void {
    if (this.intervalId !== null) return;

    this.intervalId = window.setInterval(async () => {
      try {
        const response = await fetch('/api/documents/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lastSync: this.lastSyncTime }),
        });

        if (response.ok) {
          const data = await response.json();

          if (data.hasChanges) {
            const result = await loadDocumentsFromDirectory(1000, 200, this.getExistingNames());
            if (result.loaded > 0) {
              this.lastSyncTime = Date.now();
              this.onChangeCallback(result);
            }
          }
        }
      } catch (error) {
        console.error('Directory sync error:', error);
      }
    }, this.pollInterval);
  }

  stop(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  isRunning(): boolean {
    return this.intervalId !== null;
  }
}
