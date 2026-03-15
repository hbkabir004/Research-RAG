import { DocumentChunk } from '@/types';

// Regex patterns for mathematical content
const MATH_PATTERNS = {
  latex: /\$\$[\s\S]*?\$\$|\$[^$\n]*?\$|\\begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\}/g,
  inline: /`[^`]+`/g,
};

export function extractMathContent(text: string): string[] {
  const math: string[] = [];

  // LaTeX block/inline math
  const latexMatches = text.match(MATH_PATTERNS.latex);
  if (latexMatches) math.push(...latexMatches);

  return [...new Set(math)];
}

export function chunkText(
  text: string,
  documentId: string,
  documentName: string,
  chunkSize: number = 800,
  overlap: number = 150
): DocumentChunk[] {
  if (!text.trim()) return [];

  // Split on natural boundaries: paragraphs, then sentences
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);

  const chunks: DocumentChunk[] = [];
  let currentChunk = '';
  let chunkIndex = 0;
  let lastChunkText = '';

  const addChunk = (content: string) => {
    const trimmed = content.trim();
    if (trimmed.length < 50) return;

    chunks.push({
      id: `${documentId}_chunk_${chunkIndex}`,
      documentId,
      documentName,
      content: trimmed,
      chunkIndex: chunkIndex++,
      mathContent: extractMathContent(trimmed),
    });

    lastChunkText = trimmed;
  };

  for (const paragraph of paragraphs) {
    // If paragraph itself is too long, split by sentences
    if (paragraph.length > chunkSize * 1.5) {
      const sentences = paragraph.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [paragraph];

      for (const sentence of sentences) {
        if ((currentChunk + ' ' + sentence).length > chunkSize && currentChunk.length > 0) {
          addChunk(currentChunk);
          // Add overlap from previous chunk
          const overlapText = lastChunkText.slice(-overlap);
          currentChunk = overlapText + ' ' + sentence;
        } else {
          currentChunk += (currentChunk ? ' ' : '') + sentence;
        }
      }
    } else {
      if ((currentChunk + '\n\n' + paragraph).length > chunkSize && currentChunk.length > 0) {
        addChunk(currentChunk);
        // Add overlap
        const overlapText = lastChunkText.slice(-overlap);
        currentChunk = overlapText + '\n\n' + paragraph;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }
  }

  // Add remaining content
  if (currentChunk.trim()) {
    addChunk(currentChunk);
  }

  return chunks;
}

export function formatChunksForContext(
  chunks: Array<{ documentName: string; chunkIndex: number; content: string }>,
  maxTokens: number = 6000
): string {
  let context = '';
  let estimatedTokens = 0;

  for (const chunk of chunks) {
    const section = `\n\n---\n[Source: ${chunk.documentName}, Section ${chunk.chunkIndex + 1}]\n${chunk.content}`;
    const sectionTokens = section.length / 4; // rough token estimate

    if (estimatedTokens + sectionTokens > maxTokens) break;

    context += section;
    estimatedTokens += sectionTokens;
  }

  return context.trim();
}
