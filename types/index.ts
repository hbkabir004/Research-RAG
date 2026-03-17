export type Role = 'phd' | 'reviewer' | 'mentor' | 'writer';

export interface RoleConfig {
  id: Role;
  label: string;
  emoji: string;
  description: string;
  systemPrompt: string;
  color: string;
}

export interface ApiKey {
  id: string;
  key: string;
  label: string;
  status: 'active' | 'rate-limited' | 'error' | 'untested';
  lastUsed?: number;
  rateLimitedUntil?: number;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  documentName: string;
  content: string;
  chunkIndex: number;
  embedding?: number[];
  mathContent?: string[];
}

export interface ProcessedDocument {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'txt' | 'md' | 'pptx';
  size: number;
  chunks: DocumentChunk[];
  processedAt: number;
  status: 'processing' | 'ready' | 'error';
  errorMessage?: string;
  pageCount?: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  sources?: SourceCitation[];
  plagiarismResult?: PlagiarismResult;
  isLoading?: boolean;
  model?: string;
}

export interface SourceCitation {
  documentName: string;
  documentId: string;
  chunkIndex: number;
  relevanceScore: number;
  excerpt: string;
}

export interface PlagiarismResult {
  score: number; // 0-100 (0 = original, 100 = plagiarized)
  matches: PlagiarismMatch[];
  suggestions: string[];
  isChecking?: boolean;
}

export interface PlagiarismMatch {
  source: string;
  matchedText: string;
  similarityScore: number;
  suggestion: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  role: Role;
}

export interface AppSettings {
  apiKeys: ApiKey[];
  currentKeyIndex: number;
  selectedModel: string;
  autoCheckPlagiarism: boolean;
  maxChunksPerQuery: number;
  chunkSize: number;
  chunkOverlap: number;
}

export interface VectorStoreEntry {
  chunk: DocumentChunk;
  vector: number[];
}

export type WritingMode =
  | 'literature-review'
  | 'abstract'
  | 'methodology'
  | 'results'
  | 'discussion'
  | 'conclusion'
  | 'paraphrase'
  | 'summarize'
  | null;

export interface OpenRouterModel {
  id: string;
  name: string;
  context_length: number;
  pricing: { prompt: string; completion: string };
}
