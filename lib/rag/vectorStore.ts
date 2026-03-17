import { DocumentChunk, VectorStoreEntry, SourceCitation } from '@/types';

// TF-IDF based similarity search (no external dependencies)
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function computeTFIDF(tokens: string[], allDocs: string[][]): Map<string, number> {
  const tf = new Map<string, number>();
  const docCount = allDocs.length;

  // Term frequency
  tokens.forEach((t) => tf.set(t, (tf.get(t) || 0) + 1));
  tf.forEach((count, term) => tf.set(term, count / tokens.length));

  // IDF
  const idf = new Map<string, number>();
  tf.forEach((_, term) => {
    const docsWithTerm = allDocs.filter((doc) => doc.includes(term)).length;
    idf.set(term, Math.log((docCount + 1) / (docsWithTerm + 1)) + 1);
  });

  // TF-IDF
  const tfidf = new Map<string, number>();
  tf.forEach((tfVal, term) => {
    tfidf.set(term, tfVal * (idf.get(term) || 1));
  });

  return tfidf;
}

function cosineSimilarity(vecA: Map<string, number>, vecB: Map<string, number>): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  vecA.forEach((val, term) => {
    dotProduct += val * (vecB.get(term) || 0);
    normA += val * val;
  });

  vecB.forEach((val) => {
    normB += val * val;
  });

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// BM25 scoring for better retrieval
function bm25Score(
  queryTokens: string[],
  docTokens: string[],
  k1: number = 1.5,
  b: number = 0.75,
  avgDocLength: number = 100
): number {
  const docLength = docTokens.length;
  const tf = new Map<string, number>();
  docTokens.forEach((t) => tf.set(t, (tf.get(t) || 0) + 1));

  let score = 0;
  queryTokens.forEach((term) => {
    const termFreq = tf.get(term) || 0;
    if (termFreq > 0) {
      const numerator = termFreq * (k1 + 1);
      const denominator = termFreq + k1 * (1 - b + b * (docLength / avgDocLength));
      score += numerator / denominator;
    }
  });

  return score;
}

export class VectorStore {
  private entries: VectorStoreEntry[] = [];
  private tokenizedDocs: string[][] = [];

  async addChunks(chunks: DocumentChunk[]): Promise<void> {
    const BATCH_SIZE = 50;
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      
      batch.forEach((chunk) => {
        const tokens = tokenize(chunk.content);
        this.tokenizedDocs.push(tokens);
        this.entries.push({ chunk, vector: [] });
      });

      // Yield to main thread every batch to keep UI responsive
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  removeDocument(documentId: string): void {
    const indices: number[] = [];
    this.entries.forEach((entry, i) => {
      if (entry.chunk.documentId === documentId) {
        indices.push(i);
      }
    });

    // Remove in reverse order to preserve indices
    indices.reverse().forEach((i) => {
      this.entries.splice(i, 1);
      this.tokenizedDocs.splice(i, 1);
    });
  }

  search(query: string, topK: number = 5): SourceCitation[] {
    if (this.entries.length === 0) return [];

    const queryTokens = tokenize(query);
    const avgDocLength = this.tokenizedDocs.reduce((sum, d) => sum + d.length, 0) / this.tokenizedDocs.length;

    // Compute TF-IDF vectors
    const queryTFIDF = computeTFIDF(queryTokens, this.tokenizedDocs);

    const scores = this.entries.map((entry, i) => {
      const docTokens = this.tokenizedDocs[i];
      const docTFIDF = computeTFIDF(docTokens, this.tokenizedDocs);

      const tfidfScore = cosineSimilarity(queryTFIDF, docTFIDF);
      const bm25 = bm25Score(queryTokens, docTokens, 1.5, 0.75, avgDocLength);

      // Combine scores
      const combinedScore = tfidfScore * 0.4 + (bm25 / (bm25 + 10)) * 0.6;

      return { entry, score: combinedScore, index: i };
    });

    return scores
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(({ entry, score }) => ({
        documentName: entry.chunk.documentName,
        documentId: entry.chunk.documentId,
        chunkIndex: entry.chunk.chunkIndex,
        relevanceScore: Math.min(score * 100, 99),
        excerpt: entry.chunk.content.slice(0, 200) + (entry.chunk.content.length > 200 ? '...' : ''),
      }));
  }

  getChunkContent(documentId: string, chunkIndex: number): string {
    const entry = this.entries.find(
      (e) => e.chunk.documentId === documentId && e.chunk.chunkIndex === chunkIndex
    );
    return entry?.chunk.content || '';
  }

  getSize(): number {
    return this.entries.length;
  }

  clear(): void {
    this.entries = [];
    this.tokenizedDocs = [];
  }

  getDocumentIds(): string[] {
    return [...new Set(this.entries.map((e) => e.chunk.documentId))];
  }
}

// Singleton instance
let globalStore: VectorStore | null = null;

export function getVectorStore(): VectorStore {
  if (!globalStore) {
    globalStore = new VectorStore();
  }
  return globalStore;
}

export function resetVectorStore(): void {
  globalStore = new VectorStore();
}
