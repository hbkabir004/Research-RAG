
import { DocumentChunk } from '@/types';
import JSZip from 'jszip';

// Minimal required functions from the chunker logic
const MATH_PATTERNS = {
  latexDisplay: /\$\$([\s\S]*?)\$\$/g,
  latexInline: /\$([^$\n]+)\$/g,
  latexEnv: /\\begin\{(equation|align|gather|multline|eqnarray)\}([\s\S]*?)\\end\{\1\}/g,
  mathJaxInline: /\\\(([^)]+)\\\)/g,
  mathJaxDisplay: /\\\[([^\]]+)\\\]/g,
  fractions: /\\frac\{[^}]+\}\{[^}]+\}/g,
  squareRoots: /\\sqrt\[[\d]+\]\{[^}]+\}|\\sqrt\{[^}]+\}/g,
  summations: /\\sum(?:_\{[^}]*\})?(?:\^\{[^}]*\})?/g,
  integrals: /\\int(?:_\{[^}]*\})?(?:\^\{[^}]*\})?/g,
  limits: /\\lim_\{[^}]*\}/g,
  binomials: /\\binom\{[^}]+\}\{[^}]+\}/g,
  superSub: /[\w\d]+[\^_]\{?[\w\d]+\}?/g,
  fractionsSimple: /[\w\d]+\s*\/\s*[\w\d]+/g,
  greek: /\\(?:alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega)(?:\s*\{[^}]*\})?/g,
};

function extractMathExpressions(text: string): string[] {
  const mathExpressions: string[] = [];
  const patterns = Object.values(MATH_PATTERNS);
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      mathExpressions.push(match[0]);
    }
  }
  return mathExpressions;
}

function extractTextFromSlideXML(xml: string): string {
  // Simple XML tag stripping for PPTX slide content
  return xml
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

self.onmessage = async (e: MessageEvent) => {
  const { file, fileType, chunkSize, chunkOverlap, id, name, arrayBuffer } = e.data;

  try {
    let text = '';
    
    if (fileType === 'txt' || fileType === 'md') {
      text = await file.text();
    } else if (fileType === 'pptx') {
      const zip = await JSZip.loadAsync(arrayBuffer);
      const slideTexts: string[] = [];
      
      const slideFiles = Object.keys(zip.files)
        .filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'))
        .sort((a, b) => {
          const matchA = a.match(/\d+/);
          const matchB = b.match(/\d+/);
          const numA = matchA ? parseInt(matchA[0]) : 0;
          const numB = matchB ? parseInt(matchB[0]) : 0;
          return numA - numB;
        });

      for (let i = 0; i < slideFiles.length; i++) {
        const slideContent = await zip.file(slideFiles[i])?.async('string');
        if (slideContent) {
          const slideText = extractTextFromSlideXML(slideContent);
          if (slideText.trim()) {
            slideTexts.push(`[Slide ${i + 1}] ${slideText}`);
          }
        }
      }
      
      text = slideTexts.join('\n\n');
    } else {
      self.postMessage({ type: 'error', error: `Unsupported file type in worker: ${fileType}`, fileId: id });
      return;
    }

    const mathExpressions = extractMathExpressions(text);
    const chunks = chunkTextFromContent(text, name, id, chunkSize, chunkOverlap, mathExpressions);
    
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
  chunkOverlap: number,
  mathExpressions: string[]
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
        mathContent: mathExpressions.filter(m => currentChunk.includes(m)),
      });
      chunkIndex++;

      // Add overlap
      const sentences = currentChunk.split(/[.!?]+/);
      const overlapSentences = sentences.slice(-Math.ceil(chunkOverlap / 100)).join('. ');
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
      mathContent: mathExpressions.filter(m => currentChunk.includes(m)),
    });
  }

  return chunks;
}
