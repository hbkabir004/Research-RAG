'use client';
import { parseDOCX } from '@/lib/parsers/docxParser';
import { parseMdFile } from '@/lib/parsers/mdParser';
import { parsePDF } from '@/lib/parsers/pdfParser';
import { parsePptxFile } from '@/lib/parsers/pptxParser';
import { parseTxtFile } from '@/lib/parsers/txtParser';
import { chunkText } from '@/lib/rag/chunker';
import { DirectoryWatcher, loadDocumentsFromDirectory } from '@/lib/rag/directorySync';
import { getVectorStore } from '@/lib/rag/vectorStore';
import { useAppStore } from '@/store/appStore';
import { ProcessedDocument } from '@/types';
import { AlertCircle, CheckCircle, Database, FileText, FolderOpen, Loader2, RefreshCw, Upload, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

const genId = () => `doc_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
const fmtSize = (b: number) => b < 1048576 ? `${(b/1024).toFixed(1)}KB` : `${(b/1048576).toFixed(1)}MB`;

export default function DocumentPanel() {
  const { documents, addDocument, updateDocument, removeDocument } = useAppStore();
  const [dragging, setDragging] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0, file: '' });
  const [watching, setWatching] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const watcherRef = useRef<DirectoryWatcher | null>(null);
  const store = getVectorStore();

  const processFile = useCallback(async (file: File) => {
    const id = genId();
    let type: 'pdf' | 'docx' | 'txt' | 'md' | 'pptx' = 'pdf';

    if (file.name.endsWith('.pdf')) type = 'pdf';
    else if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) type = 'docx';
    else if (file.name.endsWith('.txt')) type = 'txt';
    else if (file.name.endsWith('.md') || file.name.endsWith('.markdown')) type = 'md';
    else if (file.name.endsWith('.pptx') || file.name.endsWith('.ppt')) type = 'pptx';

    addDocument({ id, name: file.name, type, size: file.size, chunks: [], processedAt: Date.now(), status: 'processing' });

    try {
      let chunks;
      let pageCount: number | undefined;

      switch (type) {
        case 'pdf':
          const buf = await file.arrayBuffer();
          const pdfResult = await parsePDF(buf);
          chunks = chunkText(pdfResult.text, id, file.name);
          pageCount = pdfResult.pageCount;
          break;
        case 'docx':
          const docxBuf = await file.arrayBuffer();
          const docxResult = await parseDOCX(docxBuf);
          chunks = chunkText(docxResult.text, id, file.name);
          break;
        case 'txt':
          chunks = await parseTxtFile(file);
          break;
        case 'md':
          chunks = await parseMdFile(file);
          break;
        case 'pptx':
          chunks = await parsePptxFile(file);
          break;
        default:
          throw new Error('Unsupported file type');
      }

      store.addChunks(chunks);
      updateDocument(id, { status: 'ready', chunks, pageCount });
    } catch (e) {
      updateDocument(id, { status: 'error', errorMessage: e instanceof Error ? e.message : 'Parse failed' });
    }
  }, [addDocument, updateDocument, store]);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const valid = Array.from(files).filter(f =>
      f.name.endsWith('.pdf') ||
      f.name.endsWith('.docx') ||
      f.name.endsWith('.doc') ||
      f.name.endsWith('.txt') ||
      f.name.endsWith('.md') ||
      f.name.endsWith('.markdown') ||
      f.name.endsWith('.pptx') ||
      f.name.endsWith('.ppt')
    );
    for (const f of valid) await processFile(f);
  }, [processFile]);

  const syncFromDirectory = useCallback(async () => {
    setSyncing(true);
    setSyncProgress({ current: 0, total: 0, file: 'Starting sync...' });
    try {
      const existingNames = documents.map(d => d.name);
      const result = await loadDocumentsFromDirectory(1000, 200, existingNames, (processed, total, currentFile) => {
        setSyncProgress({ current: processed, total, file: currentFile });
      });

      for (const doc of result.documents) {
        addDocument(doc);
      }

      if (result.failed > 0) {
        console.warn('Some documents failed to load:', result.errors);
      }
    } catch (error) {
      console.error('Failed to sync from directory:', error);
    } finally {
      setSyncing(false);
      setSyncProgress({ current: 0, total: 0, file: '' });
    }
  }, [addDocument, documents]);

  const toggleDirectoryWatch = useCallback(() => {
    if (watching) {
      watcherRef.current?.stop();
      setWatching(false);
    } else {
      if (!watcherRef.current) {
        watcherRef.current = new DirectoryWatcher((result) => {
          for (const doc of result.documents) {
            addDocument(doc);
          }
        }, () => documents.map(d => d.name), 30000); // Check every 30 seconds
      }
      watcherRef.current.start();
      setWatching(true);
    }
  }, [watching, addDocument, documents]);

  const ready = documents.filter(d => d.status === 'ready');
  const totalChunks = ready.reduce((s,d) => s + d.chunks.length, 0);

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      {/* Stats */}
      {ready.length > 0 && (
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 16px', borderBottom:'1px solid var(--border-1)', background:'var(--bg-2)' }}>
          <Database size={12} color="var(--amber-500)" />
          <span style={{ fontSize:11.5, color:'var(--text-3)' }}>{ready.length} doc{ready.length!==1?'s':''}</span>
          <span style={{ color:'var(--border-2)' }}>·</span>
          <span style={{ fontSize:11.5, color:'var(--green-400)' }}>{totalChunks} chunks indexed</span>
        </div>
      )}

      {/* Directory sync buttons */}
      <div style={{ padding:'8px 16px', borderBottom:'1px solid var(--border-1)', background:'var(--bg-1)' }}>
        <div style={{ display:'flex', gap:6, marginBottom:8 }}>
          <button
            onClick={syncFromDirectory}
            disabled={syncing}
            style={{
              flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, fontSize:10.5, fontWeight:500,
              padding:'6px 10px', borderRadius:6, border:'1px solid var(--border-1)',
              background:syncing ? 'var(--bg-2)' : 'var(--bg-0)', color:syncing ? 'var(--text-4)' : 'var(--text-3)',
              cursor:syncing ? 'not-allowed' : 'pointer', transition:'all 0.15s', fontFamily:'inherit',
            }}
            onMouseEnter={(e) => !syncing && (e.currentTarget.style.borderColor='var(--amber-600)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor='var(--border-1)')}
          >
            {syncing ? <Loader2 size={12} className="animate-spin" /> : <FolderOpen size={12} />}
            {syncing ? 'Syncing…' : 'Sync /documents'}
          </button>
          <button
            onClick={toggleDirectoryWatch}
            style={{
              flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, fontSize:10.5, fontWeight:500,
              padding:'6px 10px', borderRadius:6, border:'1px solid var(--border-1)',
              background:watching ? 'var(--amber-500)' : 'var(--bg-0)',
              color:watching ? '#ffffff' : 'var(--text-3)',
              cursor:'pointer', transition:'all 0.15s', fontFamily:'inherit',
            }}
            onMouseEnter={(e) => !watching && (e.currentTarget.style.borderColor='var(--amber-600)')}
            onMouseLeave={(e) => !watching && (e.currentTarget.style.borderColor='var(--border-1)')}
          >
            {watching ? <RefreshCw size={12} style={{ animation:'spin 2s linear infinite' }} /> : <RefreshCw size={12} />}
            {watching ? 'Watching' : 'Watch Folder'}
          </button>
        </div>
        
        {syncing && syncProgress.total > 0 && (
          <div style={{ marginBottom:10, padding:'8px', background:'var(--bg-2)', borderRadius:6, border:'1px solid var(--border-1)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
              <span style={{ fontSize:10, fontWeight:600, color:'var(--text-2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'70%' }}>
                {syncProgress.file}
              </span>
              <span style={{ fontSize:10, fontWeight:600, color:'var(--amber-600)' }}>
                {syncProgress.current} / {syncProgress.total}
              </span>
            </div>
            <div style={{ height:4, width:'100%', background:'var(--bg-3)', borderRadius:2, overflow:'hidden' }}>
              <div style={{ 
                height:'100%', 
                width:`${(syncProgress.current / syncProgress.total) * 100}%`, 
                background:'var(--amber-500)',
                transition:'width 0.3s ease'
              }} />
            </div>
          </div>
        )}
        
        <div style={{ 
          fontSize:10, color:'var(--text-4)', lineHeight:1.4, 
          padding:'6px 8px', borderRadius:4, background:'var(--bg-2)', border:'1px dashed var(--border-1)' 
        }}>
          <p><strong>Watch Directory:</strong> Files in <code>public/documents/</code> are automatically indexed. "Sync" checks for new files now.</p>
        </div>
      </div>

      {/* Drop zone */}
      <div className={`drop-zone ${dragging ? 'dragging' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => fileRef.current?.click()}>
        <Upload size={20} color={dragging ? 'var(--amber-400)' : 'var(--text-4)'} style={{ margin:'0 auto 8px' }} />
        <p style={{ fontSize:12.5, color: dragging ? 'var(--amber-400)' : 'var(--text-3)', fontWeight:500 }}>Drop documents to upload</p>
        <p style={{ fontSize:11, color:'var(--text-4)', marginTop:3 }}>PDF, DOCX, TXT, MD, PPTX supported</p>
        <input ref={fileRef} type="file" multiple accept=".pdf,.docx,.doc,.txt,.md,.markdown,.pptx,.ppt" style={{ display:'none' }}
          onChange={e => e.target.files && handleFiles(e.target.files)} />
      </div>

      {/* List */}
      <div style={{ flex:1, overflowY:'auto' }}>
        {documents.length === 0 ? (
          <div style={{ textAlign:'center', padding:'32px 20px' }}>
            <FileText size={32} color="var(--border-2)" style={{ margin:'0 auto 10px' }} />
            <p style={{ fontSize:12, color:'var(--text-4)' }}>No documents loaded</p>
            <p style={{ fontSize:11, color:'var(--bg-4)', marginTop:4 }}>Upload files or sync from /documents folder</p>
          </div>
        ) : documents.map(doc => (
          <DocItem key={doc.id} doc={doc} onRemove={() => { store.removeDocument(doc.id); removeDocument(doc.id); }} />
        ))}
      </div>
    </div>
  );
}

function DocItem({ doc, onRemove }: { doc: ProcessedDocument; onRemove: () => void }) {
  return (
    <div className="doc-item" style={{ position:'relative' }}>
      <div style={{ flexShrink:0, marginTop:1 }}>
        {doc.status === 'processing' ? <Loader2 size={14} color="var(--amber-400)" style={{ animation:'spin 1s linear infinite' }} />
        : doc.status === 'error' ? <AlertCircle size={14} color="var(--red-400)" />
        : <CheckCircle size={14} color="var(--green-400)" /> }
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:12.5, color:'var(--text-1)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', fontWeight:500 }} title={doc.name}>{doc.name}</p>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:3 }}>
          <span style={{ fontSize:10, color:'var(--text-4)', textTransform:'uppercase', fontFamily:'JetBrains Mono,monospace', letterSpacing:'0.05em', fontWeight:600 }}>{doc.type}</span>
          <span style={{ color:'var(--border-1)' }}>·</span>
          <span style={{ fontSize:11, color:'var(--text-4)' }}>{fmtSize(doc.size)}</span>
          {doc.status === 'ready' && <><span style={{ color:'var(--border-1)' }}>·</span><span style={{ fontSize:11, color:'var(--green-400)' }}>{doc.chunks.length} chunks</span></>}
          {doc.status === 'processing' && <span style={{ fontSize:11, color:'var(--amber-400)' }}>Indexing…</span>}
          {doc.status === 'error' && <span style={{ fontSize:11, color:'var(--red-400)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:80 }}>{doc.errorMessage}</span>}
        </div>
      </div>
      {doc.status !== 'processing' && (
        <button onClick={onRemove} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-4)', padding:3, borderRadius:4, transition:'color 0.15s', flexShrink:0 }}
          onMouseEnter={e => (e.currentTarget.style.color='var(--red-400)') }
          onMouseLeave={e => (e.currentTarget.style.color='var(--text-4)')}>
          <X size={13} />
        </button>
      )}
    </div>
  );
}
