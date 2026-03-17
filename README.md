# ResearchAI — MSc Research Companion

An AI-powered RAG chatbot for academic research, built with Next.js, TypeScript, Tailwind CSS, and OpenRouter.

## Quick Start

```bash
npm install
npm run dev
```
Open http://localhost:3000

## Setup

1. **Add API Keys** — Settings tab → add free keys from openrouter.ai/keys
2. **Upload Documents** — Documents tab → drag .pdf or .docx files, or place them in `public/documents/` and enable **Watch Directory** for automatic background indexing.
3. **Select Role** — Choose PhD Researcher / Expert Reviewer / Research Mentor / Academic Writer
4. **Chat** — Ask questions, use Writing Mode for generating sections

## Key Features

- **Incremental Watch Directory**: Optimized background syncing that only processes new files, preventing UI lag and high memory usage.
- **RAG Pipeline**: TF-IDF + BM25 similarity, in-browser chunking and retrieval.
- **Key Rotation**: Auto-rotates on 429 errors, round-robin across all keys.
- **Plagiarism Check**: Local n-gram similarity against knowledge base.
- **Math**: LaTeX/KaTeX rendering in documents and responses.
- **Storage**: All data in localStorage — nothing stored on any server.

## Tech Stack

Next.js 16 · TypeScript · Tailwind CSS · Zustand · pdfjs-dist · mammoth · react-markdown · remark-math · rehype-katex · lucide-react

## Free Models via OpenRouter

Llama 3.3 8B · Llama 3.1 8B · Gemma 3 9B · Mistral 7B · DeepSeek R1 · Qwen3 8B
