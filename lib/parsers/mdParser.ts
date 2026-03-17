import { DocumentChunk } from '@/types';

/**
 * Parse markdown files with enhanced math content extraction
 */
export async function parseMdFile(
  file: File,
  chunkSize: number = 1000,
  chunkOverlap: number = 200
): Promise<DocumentChunk[]> {
  const text = await file.text();

  // Extract mathematical content first
  const mathExpressions = extractMathExpressions(text);

  // Remove code blocks temporarily to avoid splitting them
  const codeBlocks: string[] = [];
  let processedText = text.replace(/```[\s\S]*?```/g, (match) => {
    codeBlocks.push(match);
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });

  // Split into sections based on markdown headers
  const sections = processedText.split(/^#{1,6}\s+.+$/gm).filter(s => s.trim().length > 0);

  const chunks: DocumentChunk[] = [];
  let currentChunk = '';
  let chunkIndex = 0;

  for (const section of sections) {
    // Restore code blocks
    let restoredSection = section.replace(/__CODE_BLOCK_(\d+)__/g, (_, index) => {
      return codeBlocks[parseInt(index)] || '';
    });

    // Split section into paragraphs
    const paragraphs = restoredSection
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0 && !p.startsWith('```')); // Skip standalone code block markers

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
  }

  // Don't forget the last chunk
  if (currentChunk.trim().length > 0) {
    chunks.push(createChunk(file.name, chunkIndex, currentChunk.trim(), mathExpressions));
  }

  return chunks;
}

/**
 * Extract mathematical expressions from markdown
 * Supports: LaTeX (inline and display), MathJax, KaTeX, AsciiMath
 */
function extractMathExpressions(text: string): string[] {
  const mathExpressions: string[] = [];

  // Extract inline LaTeX $...$
  const latexInlineRegex = /\$([^$\n]+)\$/g;
  let match;
  while ((match = latexInlineRegex.exec(text)) !== null) {
    mathExpressions.push(match[1].trim());
  }

  // Extract display LaTeX $$...$$
  const latexDisplayRegex = /\$\$([^$]+)\$\$/g;
  while ((match = latexDisplayRegex.exec(text)) !== null) {
    mathExpressions.push(match[1].trim());
  }

  // Extract LaTeX environments \begin{equation}...\end{equation}
  const latexEnvRegex = /\\begin\{(equation|align|gather|multline)\}([\s\S]*?)\\end\{\1\}/g;
  while ((match = latexEnvRegex.exec(text)) !== null) {
    mathExpressions.push(match[2].trim());
  }

  // Extract MathJax \(...\) and \[...\]
  const mathJaxInlineRegex = /\\\(([^)]+)\\\)/g;
  while ((match = mathJaxInlineRegex.exec(text)) !== null) {
    mathExpressions.push(match[1].trim());
  }

  const mathJaxDisplayRegex = /\\\[([^\]]+)\\\]/g;
  while ((match = mathJaxDisplayRegex.exec(text)) !== null) {
    mathExpressions.push(match[1].trim());
  }

  // Extract code blocks with math (between ```math and ```)
  const mathCodeBlockRegex = /```math\s*([\s\S]*?)```/g;
  while ((match = mathCodeBlockRegex.exec(text)) !== null) {
    mathExpressions.push(match[1].trim());
  }

  // Extract AsciiMath notation
  const asciimathRegex = /`([^`]*[\\/^_{}]+[^`]*)`/g;
  while ((match = asciimathRegex.exec(text)) !== null) {
    const content = match[1];
    // Only include if it looks like math
    if (/[\\/^_{}]/.test(content)) {
      mathExpressions.push(content);
    }
  }

  // Extract individual LaTeX math commands
  const latexCommands = [
    /\\frac\{[^}]+\}\{[^}]+\}/g, // Fractions
    /\\sqrt\[[\d]+\]\{[^}]+\}|\\sqrt\{[^}]+\}/g, // Square roots
    /\\sum_\{[^}]*\}\^?\{[^}]*\}/g, // Summations
    /\\int_\{[^}]*\}\^?\{[^}]*\}/g, // Integrals
    /\\lim_\{[^}]*\}/g, // Limits
    /\\binom\{[^}]+\}\{[^}]+\}/g, // Binomial coefficients
  ];

  for (const regex of latexCommands) {
    while ((match = regex.exec(text)) !== null) {
      mathExpressions.push(match[0]);
    }
  }

  // Extract Greek letters and math symbols
  const greekRegex = /\\[alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega]+(?:\s*\{[^}]*\})?/g;
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
