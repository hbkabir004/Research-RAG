# Documents Directory

Place your research documents in this folder to automatically load them into the RAG chatbot.

## Supported File Formats

- **PDF** (`.pdf`) - Academic papers, reports, books
- **Microsoft Word** (`.docx`, `.doc`) - Word documents
- **Plain Text** (`.txt`) - Text files
- **Markdown** (`.md`, `.markdown`) - Markdown files with math support
- **PowerPoint** (`.pptx`, `.ppt`) - Presentation files

## Math Content Support

All parsers support enhanced mathematical content extraction:

- LaTeX expressions (inline `$...$` and display `$$...$$`)
- MathJax notation (`\(...\)` and `\[...\]`)
- Greek letters and mathematical symbols
- Fractions, integrals, summations, and more
- Special support for markdown files with math blocks

## Features

- **Automatic Loading**: Click "Load from /documents" button to load all files
- **Directory Watching**: Enable "Watch Directory" to auto-sync when files change
- **Multi-Format Support**: Process multiple file types simultaneously
- **Math-Aware RAG**: Better retrieval for mathematical and technical content

## Usage

1. Copy your research documents to this folder
2. In the app, click "Load from /documents" to import them
3. Optionally enable "Watch Directory" for automatic updates

## Example

Place a file like `research_paper.pdf` in this folder, then:
1. Open the app
2. Click "Load from /documents" in the Documents panel
3. The file will be processed and indexed for RAG queries
