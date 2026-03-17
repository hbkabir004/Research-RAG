import { DocumentChunk } from '@/types';

/**
 * Parse plain text files with enhanced math content extraction
 */
export async function parseTxtFile(
  file: File,
  chunkSize: number = 1000,
  chunkOverlap: number = 200
): Promise<DocumentChunk[]> {
  const text = await file.text();
  const chunks: DocumentChunk[] = [];

  // Extract mathematical content from the text
  const mathExpressions = extractMathExpressions(text);

  // Split text into paragraphs (by double newlines or significant breaks)
  const paragraphs = text
    .split(/\n\s*\n|\n(?=[A-Z][^.])/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  let currentChunk = '';
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed chunk size, save current chunk
    if (currentChunk.length + paragraph.length > chunkSize && currentChunk.length > 0) {
      chunks.push(createChunk(file.name, chunkIndex, currentChunk.trim(), mathExpressions));
      chunkIndex++;
      // Start new chunk with overlap
      const sentences = currentChunk.split(/[.!?]+/);
      const overlapSentences = sentences.slice(-Math.ceil(chunkOverlap / 100)).join('. ');
      currentChunk = overlapSentences + (overlapSentences ? '. ' : '') + paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim().length > 0) {
    chunks.push(createChunk(file.name, chunkIndex, currentChunk.trim(), mathExpressions));
  }

  return chunks;
}

/**
 * Extract mathematical expressions from plain text
 * Supports: LaTeX, basic math notation, equations
 */
function extractMathExpressions(text: string): string[] {
  const mathExpressions: string[] = [];

  // Extract LaTeX expressions (both inline $...$ and display $$...$$)
  const latexInlineRegex = /\$([^$\n]+)\$/g;
  const latexDisplayRegex = /\$\$([^$]+)\$\$/g;
  const latexEnvRegex = /\\begin\{(equation|align|gather)\}([\s\S]*?)\\end\{\1\}/g;

  // Extract inline LaTeX
  let match;
  while ((match = latexInlineRegex.exec(text)) !== null) {
    mathExpressions.push(match[1].trim());
  }

  // Extract display LaTeX
  while ((match = latexDisplayRegex.exec(text)) !== null) {
    mathExpressions.push(match[1].trim());
  }

  // Extract LaTeX environments
  while ((match = latexEnvRegex.exec(text)) !== null) {
    mathExpressions.push(match[2].trim());
  }

  // Extract mathematical notation patterns
  // Fractions: a/b, \frac{a}{b}
  const fractionRegex = /\\frac\{[^}]+\}\{[^}]+\}|[\w\d]+\s*\/\s*[\w\d]+/g;
  while ((match = fractionRegex.exec(text)) !== null) {
    mathExpressions.push(match[0]);
  }

  // Superscripts and subscripts: x^2, H_2O
  const superSubRegex = /[\w\d]+[\^_]\{?[\w\d]+\}?/g;
  while ((match = superSubRegex.exec(text)) !== null) {
    mathExpressions.push(match[0]);
  }

  // Square roots: \sqrt{x}
  const sqrtRegex = /\\sqrt\{[^}]+\}/g;
  while ((match = sqrtRegex.exec(text)) !== null) {
    mathExpressions.push(match[0]);
  }

  // Greek letters and math symbols
  const greekRegex = /\\[alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega]+/g;
  while ((match = greekRegex.exec(text)) !== null) {
    mathExpressions.push(match[0]);
  }

  return [...new Set(mathExpressions)]; // Remove duplicates
}

function createChunk(
  documentName: string,
  chunkIndex: number,
  content: string,
  mathExpressions: string[]
): DocumentChunk {
  // Find which math expressions are in this chunk
  const chunkMath = mathExpressions.filter(expr => content.includes(expr));

  return {
    id: `${documentName}-${chunkIndex}`,
    documentId: documentName,
    documentName,
    content,
    chunkIndex,
    mathContent: chunkMath.length > 0 ? chunkMath : undefined,
  };
}
