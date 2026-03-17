
import { DocumentChunk } from '@/types';

// Minimal required parsers for the worker
// In a real environment, we'd bundle these or use importScripts
// For this task, we'll implement a simplified version of the logic

self.onmessage = async (e: MessageEvent) => {
  const { file, fileType, chunkSize, chunkOverlap, id, name } = e.data;

  try {
    let text = '';
    
    // In a Web Worker, we can't easily use the existing parsers because they
    // rely on browser APIs like Canvas (pdfjs) or DOM-related libraries.
    // For now, we'll handle the text-based formats and send back a request 
    // for complex formats if they fail, or we can use the text content.
    
    if (fileType === 'txt' || fileType === 'md') {
      text = await file.text();
    } else {
      // For PDF/DOCX/PPTX, we might still need to do them on the main thread
      // if they use APIs not available in workers.
      // However, we can at least do the chunking here.
      self.postMessage({ type: 'error', error: 'Complex parsing still requires main thread', fileId: id });
      return;
    }

    // Perform chunking in the worker
    const chunks = chunkTextFromContent(text, name, id, chunkSize, chunkOverlap);
    
    self.postMessage({
      type: 'success',
      chunks,
      fileId: id,
      text
    });
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown worker error',
      fileId: id
    });
  }
};

function chunkTextFromContent(
  text: string,
  documentName: string,
  documentId: string,
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
        id: `${documentId}-${chunkIndex}`,
        documentId: documentId,
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
      id: `${documentId}-${chunkIndex}`,
      documentId: documentId,
      documentName,
      content: currentChunk.trim(),
      chunkIndex,
    });
  }

  return chunks;
}
