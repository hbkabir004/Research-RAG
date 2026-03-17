'use client';

import { useRef, useState, useCallback } from 'react';
import { Upload, FileText, Trash2, AlertCircle, CheckCircle, Loader2, BookOpen, X } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { parsePDF } from '@/lib/parsers/pdfParser';
import { parseDOCX } from '@/lib/parsers/docxParser';
import { chunkText } from '@/lib/rag/chunker';
import { getVectorStore } from '@/lib/rag/vectorStore';
import { ProcessedDocument } from '@/types';

function generateId(): string {
  return `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default function DocumentPanel() {
  const { documents, addDocument, updateDocument, removeDocument } = useAppStore();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const vectorStore = getVectorStore();

  const processFile = useCallback(async (file: File) => {
    const id = generateId();
    const type = file.name.endsWith('.pdf') ? 'pdf' : 'docx';

    const newDoc: ProcessedDocument = {
      id,
      name: file.name,
      type,
      size: file.size,
      chunks: [],
      processedAt: Date.now(),
      status: 'processing',
    };

    addDocument(newDoc);

    try {
      const buffer = await file.arrayBuffer();
      let text = '';
      let pageCount: number | undefined;

      if (type === 'pdf') {
        const result = await parsePDF(buffer);
        text = result.text;
        pageCount = result.pageCount;
      } else {
        const result = await parseDOCX(buffer);
        text = result.text;
      }

      const chunks = chunkText(text, id, file.name);
      vectorStore.addChunks(chunks);

      updateDocument(id, {
        status: 'ready',
        chunks,
        pageCount,
        processedAt: Date.now(),
      });
    } catch (error) {
      updateDocument(id, {
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Failed to process document',
      });
    }
  }, [addDocument, updateDocument, vectorStore]);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter(
      (f) => f.name.endsWith('.pdf') || f.name.endsWith('.docx')
    );
    for (const file of validFiles) {
      await processFile(file);
    }
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleRemove = (doc: ProcessedDocument) => {
    vectorStore.removeDocument(doc.id);
    removeDocument(doc.id);
  };

  const readyDocs = documents.filter((d) => d.status === 'ready');
  const totalChunks = readyDocs.reduce((sum, d) => sum + d.chunks.length, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Stats bar */}
      {readyDocs.length > 0 && (
        <div className="px-3 py-2 flex items-center gap-3 border-b border-[#e5dfd6]">
          <div className="flex items-center gap-1.5">
            <BookOpen size={11} className="text-[#c8962a]" />
            <span className="text-xs text-[#6b6460]">{readyDocs.length} docs</span>
          </div>
          <span className="text-[#a39a91]">·</span>
          <span className="text-xs text-[#6b6460]">{totalChunks} chunks indexed</span>
        </div>
      )}

      {/* Drop zone */}
      <div
        className={`m-3 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-[#c8962a] bg-[rgba(200,150,42,0.05)]'
            : 'border-[#e5dfd6] hover:border-[#c8a860] hover:bg-[#f3f1ed]'
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload size={18} className={`mx-auto mb-2 ${isDragging ? 'text-[#c8962a]' : 'text-[#a39a91]'}`} />
        <p className="text-xs text-[#a39a91]">Drop .pdf or .docx files</p>
        <p className="text-xs text-[#a39a91] mt-0.5">or click to browse</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {/* Document list */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1.5">
        {documents.length === 0 ? (
          <div className="text-center py-8">
            <FileText size={28} className="mx-auto text-[#a39a91] mb-2" />
            <p className="text-xs text-[#a39a91]">No documents yet</p>
            <p className="text-xs text-[#a39a91] mt-1">Upload research papers to begin</p>
          </div>
        ) : (
          documents.map((doc) => (
            <DocumentItem key={doc.id} doc={doc} onRemove={() => handleRemove(doc)} />
          ))
        )}
      </div>
    </div>
  );
}

function DocumentItem({ doc, onRemove }: { doc: ProcessedDocument; onRemove: () => void }) {
  return (
    <div className={`group flex items-start gap-2 p-2.5 rounded-md border transition-all ${
      doc.status === 'ready'
        ? 'border-[#e5dfd6] bg-[#ffffff] hover:border-[#d9b968]'
        : doc.status === 'error'
        ? 'border-[#e5b5b5] bg-[#fae8e8]'
        : 'border-[#e5dfd6] bg-[#ffffff]'
    }`}>
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">
        {doc.status === 'processing' ? (
          <Loader2 size={14} className="text-[#c8962a] animate-spin" />
        ) : doc.status === 'error' ? (
          <AlertCircle size={14} className="text-[#d04040]" />
        ) : (
          <CheckCircle size={14} className="text-[#4a9060]" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[#2d2522] truncate leading-tight" title={doc.name}>
          {doc.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-[#a39a91] uppercase font-mono-custom">{doc.type}</span>
          <span className="text-[#a39a91]">·</span>
          <span className="text-xs text-[#a39a91]">{formatSize(doc.size)}</span>
          {doc.status === 'ready' && doc.chunks.length > 0 && (
            <>
              <span className="text-[#a39a91]">·</span>
              <span className="text-xs text-[#4a9060]">{doc.chunks.length} chunks</span>
            </>
          )}
        </div>
        {doc.status === 'error' && doc.errorMessage && (
          <p className="text-xs text-[#d04040] mt-0.5 truncate">{doc.errorMessage}</p>
        )}
        {doc.status === 'processing' && (
          <p className="text-xs text-[#c8962a] mt-0.5">Indexing…</p>
        )}
      </div>

      {/* Remove button */}
      {doc.status !== 'processing' && (
        <button
          onClick={onRemove}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-[#d04040] text-[#a39a91]"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}
