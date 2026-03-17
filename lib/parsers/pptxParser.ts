import { DocumentChunk } from '@/types';
import JSZip from 'jszip';

/**
 * Parse PowerPoint files with enhanced math content extraction
 */
export async function parsePptxFile(
  file: File,
  chunkSize: number = 1000,
  chunkOverlap: number = 200
): Promise<DocumentChunk[]> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  // Extract text from slide XML files
  const slideTexts: string[] = [];

  // Optimization: Filter and process slides concurrently
  const slideFiles = Object.keys(zip.files).filter(
    name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml')
  ).sort((a, b) => {
    const matchA = a.match(/\d+/);
    const matchB = b.match(/\d+/);
    const numA = matchA ? parseInt(matchA[0]) : 0;
    const numB = matchB ? parseInt(matchB[0]) : 0;
    return numA - numB;
  });

  const slideContents = await Promise.all(
    slideFiles.map(file => zip.file(file)?.async('string'))
  );

  for (let i = 0; i < slideContents.length; i++) {
    const slideContent = slideContents[i];
    if (slideContent) {
      const text = extractTextFromSlideXML(slideContent);
      if (text.trim()) {
        slideTexts.push(`[Slide ${i + 1}] ${text}`);
      }
    }
  }

  // Extract notes from notes slides concurrently
  const notesFiles = Object.keys(zip.files).filter(
    name => name.startsWith('ppt/notesSlides/notesSlide') && name.endsWith('.xml')
  ).sort();

  const notesContents = await Promise.all(
    notesFiles.map(file => zip.file(file)?.async('string'))
  );

  for (const notesContent of notesContents) {
    if (notesContent) {
      const text = extractTextFromSlideXML(notesContent);
      if (text.trim()) {
        slideTexts.push(`[Notes] ${text}`);
      }
    }
  }

  // Combine all texts
  const fullText = slideTexts.join('\n\n');

  // Extract mathematical content
  const mathExpressions = extractMathExpressions(fullText);

  // Create chunks
  const chunks: DocumentChunk[] = [];
  let currentChunk = '';
  let chunkIndex = 0;

  // Process each slide as a potential chunk unit
  const paragraphs = fullText.split(/\n\n+/).filter(p => p.trim().length > 0);

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

  return chunks.length > 0 ? chunks : [{
    id: `${file.name}-0`,
    documentId: file.name,
    documentName: file.name,
    content: fullText || 'No text content found in PowerPoint file.',
    chunkIndex: 0,
  }];
}

/**
 * Extract text from PowerPoint slide XML
 */
function extractTextFromSlideXML(xmlContent: string): string {
  const textParts: string[] = [];

  // Extract text from <a:t> tags (text runs)
  const textRegex = /<a:t[^>]*>([^<]+)<\/a:t>/g;
  let match;
  while ((match = textRegex.exec(xmlContent)) !== null) {
    const text = match[1].trim();
    if (text) {
      textParts.push(text);
    }
  }

  // Extract text from <a:fld> tags (fields, which can contain equations)
  const fieldRegex = /<a:fld[^>]*>([^<]+)<\/a:fld>/g;
  while ((match = fieldRegex.exec(xmlContent)) !== null) {
    const text = match[1].trim();
    if (text && !textParts.includes(text)) {
      textParts.push(text);
    }
  }

  return textParts.join(' ');
}

/**
 * Extract mathematical expressions from PowerPoint content
 * PPTX can contain equations in XML format with m:math tags
 */
function extractMathExpressions(text: string): string[] {
  const mathExpressions: string[] = [];

  // Extract LaTeX expressions if present in exported PPTX
  const latexInlineRegex = /\$([^$\n]+)\$/g;
  let match;
  while ((match = latexInlineRegex.exec(text)) !== null) {
    mathExpressions.push(match[1].trim());
  }

  // Extract display LaTeX
  const latexDisplayRegex = /\$\$([^$]+)\$\$/g;
  while ((match = latexDisplayRegex.exec(text)) !== null) {
    mathExpressions.push(match[1].trim());
  }

  // Extract mathematical notation patterns
  // Fractions: a/b
  const fractionRegex = /[\w\d]+\s*\/\s*[\w\d]+/g;
  while ((match = fractionRegex.exec(text)) !== null) {
    if (!match[0].includes('http')) { // Avoid URLs
      mathExpressions.push(match[0]);
    }
  }

  // Superscripts and subscripts: x^2, H_2O
  const superSubRegex = /[\w\d]+[\^_]\{?[\w\d]+\}?/g;
  while ((match = superSubRegex.exec(text)) !== null) {
    mathExpressions.push(match[0]);
  }

  // Extract mathematical symbols and operators
  const mathSymbolRegex = /[αβγδεζηθικλμνξοπρστυφχψω∫∑∏√±≤≠≥∞∂∇]/g;
  while ((match = mathSymbolRegex.exec(text)) !== null) {
    mathExpressions.push(match[0]);
  }

  // Extract common mathematical words/phrases
  const mathWords = [
    /equation/i, /formula/i, /theorem/i, /proof/i, /derivative/i,
    /integral/i, /summation/i, /function/i, /variable/i, /coefficient/i,
    /matrix/i, /vector/i, /tensor/i, /derivation/i, /calculation/i
  ];

  for (const regex of mathWords) {
    while ((match = regex.exec(text)) !== null) {
      // Get surrounding context
      const start = Math.max(0, match.index - 30);
      const end = Math.min(text.length, match.index + match[0].length + 30);
      const context = text.substring(start, end).trim();
      mathExpressions.push(context);
    }
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
  const chunkMath = mathExpressions.filter(expr => content.toLowerCase().includes(expr.toLowerCase()));

  return {
    id: `${documentName}-${chunkIndex}`,
    documentId: documentName,
    documentName,
    content,
    chunkIndex,
    mathContent: chunkMath.length > 0 ? chunkMath : undefined,
  };
}
