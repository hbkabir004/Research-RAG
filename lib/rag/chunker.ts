import { DocumentChunk } from '@/types';

// Enhanced regex patterns for mathematical content
const MATH_PATTERNS = {
  // LaTeX expressions
  latexDisplay: /\$\$([\s\S]*?)\$\$/g,
  latexInline: /\$([^$\n]+)\$/g,
  latexEnv: /\\begin\{(equation|align|gather|multline|eqnarray)\}([\s\S]*?)\\end\{\1\}/g,

  // MathJax notation
  mathJaxInline: /\\\(([^)]+)\\\)/g,
  mathJaxDisplay: /\\\[([^\]]+)\\\]/g,

  // Individual LaTeX commands
  fractions: /\\frac\{[^}]+\}\{[^}]+\}/g,
  squareRoots: /\\sqrt\[[\d]+\]\{[^}]+\}|\\sqrt\{[^}]+\}/g,
  summations: /\\sum(?:_\{[^}]*\})?(?:\^\{[^}]*\})?/g,
  integrals: /\\int(?:_\{[^}]*\})?(?:\^\{[^}]*\})?/g,
  limits: /\\lim_\{[^}]*\}/g,
  binomials: /\\binom\{[^}]+\}\{[^}]+\}/g,

  // Mathematical notation
  superSub: /[\w\d]+[\^_]\{?[\w\d]+\}?/g,
  fractionsSimple: /[\w\d]+\s*\/\s*[\w\d]+/g,

  // Greek letters
  greek: /\\(?:alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega)(?:\s*\{[^}]*\})?/g,

  // Mathematical symbols
  symbols: /[αβγδεζηθικλμνξοπρστυφχψω∫∑∏√±≤≠≥∞∂∇∪∩⊂⊃∈∉∀∃∅ℕℤℚℝℂ]/g,

  // Mathematical keywords
  keywords: /\b(?:equation|formula|theorem|proof|derivative|integral|summation|function|variable|coefficient|matrix|vector|tensor|derivation|calculation|identity|inequality|polynomial|rational|exponential|logarithm|trigonometric|differential|integral|limit|series|sequence|convergence|divergence)\b/gi,

  // Code blocks (might contain math)
  codeBlock: /```(?:math)?\s*([\s\S]*?)```/g,
  inlineCode: /`([^`]+)`/g,
};

export function extractMathContent(text: string): string[] {
  const mathExpressions: string[] = [];

  // Extract LaTeX display math
  let match;
  while ((match = MATH_PATTERNS.latexDisplay.exec(text)) !== null) {
    mathExpressions.push(match[1].trim());
  }

  // Extract LaTeX inline math
  while ((match = MATH_PATTERNS.latexInline.exec(text)) !== null) {
    mathExpressions.push(match[1].trim());
  }

  // Extract LaTeX environments
  while ((match = MATH_PATTERNS.latexEnv.exec(text)) !== null) {
    mathExpressions.push(`${match[1]}: ${match[2].trim()}`);
  }

  // Extract MathJax inline
  while ((match = MATH_PATTERNS.mathJaxInline.exec(text)) !== null) {
    mathExpressions.push(match[1].trim());
  }

  // Extract MathJax display
  while ((match = MATH_PATTERNS.mathJaxDisplay.exec(text)) !== null) {
    mathExpressions.push(match[1].trim());
  }

  // Extract individual LaTeX commands
  const commandPatterns = [
    MATH_PATTERNS.fractions,
    MATH_PATTERNS.squareRoots,
    MATH_PATTERNS.summations,
    MATH_PATTERNS.integrals,
    MATH_PATTERNS.limits,
    MATH_PATTERNS.binomials,
  ];

  for (const pattern of commandPatterns) {
    while ((match = pattern.exec(text)) !== null) {
      mathExpressions.push(match[0]);
    }
  }

  // Extract superscripts and subscripts (filter out URLs)
  while ((match = MATH_PATTERNS.superSub.exec(text)) !== null) {
    if (!match[0].includes('http')) {
      mathExpressions.push(match[0]);
    }
  }

  // Extract simple fractions (avoid URLs)
  while ((match = MATH_PATTERNS.fractionsSimple.exec(text)) !== null) {
    if (!match[0].includes('http')) {
      mathExpressions.push(match[0]);
    }
  }

  // Extract Greek letters
  while ((match = MATH_PATTERNS.greek.exec(text)) !== null) {
    mathExpressions.push(match[0]);
  }

  // Extract mathematical symbols
  while ((match = MATH_PATTERNS.symbols.exec(text)) !== null) {
    mathExpressions.push(match[0]);
  }

  // Extract mathematical keywords with context
  while ((match = MATH_PATTERNS.keywords.exec(text)) !== null) {
    const keyword = match[0];
    const start = Math.max(0, match.index - 50);
    const end = Math.min(text.length, match.index + keyword.length + 50);
    const context = text.substring(start, end).trim();
    mathExpressions.push(context);
  }

  // Extract code blocks that might contain math
  while ((match = MATH_PATTERNS.codeBlock.exec(text)) !== null) {
    const content = match[1].trim();
    if (content && /[\^_{}\\]/.test(content)) {
      mathExpressions.push(content);
    }
  }

  // Extract inline code that might be math
  while ((match = MATH_PATTERNS.inlineCode.exec(text)) !== null) {
    const content = match[1].trim();
    if (content && /[\^_{}\\]/.test(content)) {
      mathExpressions.push(content);
    }
  }

  // Remove duplicates while preserving order
  return [...new Set(mathExpressions)];
}

export function chunkText(
  text: string,
  documentId: string,
  documentName: string,
  chunkSize: number = 800,
  overlap: number = 150
): DocumentChunk[] {
  if (!text.trim()) return [];

  // First, extract all math content from the document
  const allMathContent = extractMathContent(text);

  // Split on natural boundaries: paragraphs, then sentences
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);

  const chunks: DocumentChunk[] = [];
  let currentChunk = '';
  let chunkIndex = 0;
  let lastChunkText = '';

  const addChunk = (content: string) => {
    const trimmed = content.trim();
    if (trimmed.length < 50) return;

    // Extract math content specific to this chunk
    const chunkMath = extractMathContent(trimmed);

    chunks.push({
      id: `${documentId}_chunk_${chunkIndex}`,
      documentId,
      documentName,
      content: trimmed,
      chunkIndex: chunkIndex++,
      mathContent: chunkMath.length > 0 ? chunkMath : undefined,
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

/**
 * Enhanced function to find the most relevant chunks for a query
 * Considers both text similarity and math content relevance
 */
export function findRelevantChunks(
  chunks: DocumentChunk[],
  query: string,
  maxChunks: number = 5
): DocumentChunk[] {
  const queryLower = query.toLowerCase();
  const queryMath = extractMathContent(query);

  // Score chunks based on relevance
  const scoredChunks = chunks.map(chunk => {
    let score = 0;
    const contentLower = chunk.content.toLowerCase();

    // Text relevance (keyword matching)
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 3);
    for (const word of queryWords) {
      if (contentLower.includes(word)) {
        score += 1;
      }
    }

    // Math content relevance
    if (chunk.mathContent && queryMath.length > 0) {
      for (const queryExpr of queryMath) {
        for (const chunkExpr of chunk.mathContent) {
          if (chunkExpr.toLowerCase().includes(queryExpr.toLowerCase()) ||
              queryExpr.toLowerCase().includes(chunkExpr.toLowerCase())) {
            score += 2; // Math matches are weighted higher
          }
        }
      }
    }

    // Prefer chunks with math content if query contains math
    if (queryMath.length > 0 && chunk.mathContent && chunk.mathContent.length > 0) {
      score += 1;
    }

    return { chunk, score };
  });

  // Sort by score (descending) and return top chunks
  return scoredChunks
    .sort((a, b) => b.score - a.score)
    .slice(0, maxChunks)
    .map(item => item.chunk);
}
