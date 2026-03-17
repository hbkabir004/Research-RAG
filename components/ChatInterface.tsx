'use client';
import { checkPlagiarism } from '@/lib/plagiarism/checker';
import { getSystemPrompt } from '@/lib/prompts/systemPrompts';
import { formatChunksForContext } from '@/lib/rag/chunker';
import { getVectorStore } from '@/lib/rag/vectorStore';
import { useAppStore } from '@/store/appStore';
import { SourceCitation } from '@/types';
import { AlertCircle, Globe, Send, X, Zap } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import MessageBubble from './MessageBubble';
import WritingModeBar from './WritingModeBar';

const genId = () => `msg_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;

export default function ChatInterface() {
  const { settings, updateSettings, documents, sessions, currentSessionId, createSession, addMessage, updateMessage, selectedRole, writingMode } = useAppStore();
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const taRef  = useRef<HTMLTextAreaElement>(null);
  const store  = getVectorStore();

  const session  = sessions.find(s => s.id === currentSessionId);
  const messages = session?.messages || [];
  const hasKeys  = settings.apiKeys.length > 0;
  const hasDocs  = documents.some(d => d.status === 'ready');

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  useEffect(() => {
    if (taRef.current) {
      taRef.current.style.height = 'auto';
      taRef.current.style.height = Math.min(taRef.current.scrollHeight, 160) + 'px';
    }
  }, [input]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming || !hasKeys) return;
    setError(null);
    setInput('');

    let sid = currentSessionId;
    if (!sid) sid = createSession(selectedRole);

    addMessage(sid, { id:genId(), role:'user', content:text, timestamp:Date.now() });

    const aiId = genId();
    addMessage(sid, { id:aiId, role:'assistant', content:'', timestamp:Date.now(), isLoading:true });
    setStreaming(true);

    try {
      // 1. Web Search if enabled
      let webCtx = '';
      if (settings.webSearchEnabled) {
        try {
          updateMessage(sid, aiId, { content: 'Searching the web...', isLoading: true });
          const searchRes = await fetch('/api/web-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: text, apiKey: settings.serperApiKey })
          });
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            if (searchData.results && searchData.results.length > 0) {
              webCtx = "\n\n[Web Search Results]\n" + searchData.results.map((r: any, i: number) => 
                `Source [W${i+1}]: ${r.title}\nURL: ${r.link}\nSnippet: ${r.snippet}`
              ).join('\n\n');
            }
          }
        } catch (searchErr) {
          console.error('Web search failed:', searchErr);
        }
      }

      // 2. RAG retrieval
      let sources: SourceCitation[] = [];
      let ctx = '';
      if (hasDocs && store.getSize() > 0) {
        sources = store.search(text, settings.maxChunksPerQuery);
        if (sources.length) {
          ctx = formatChunksForContext(sources.map(s => ({
            documentName: s.documentName,
            chunkIndex:   s.chunkIndex,
            content:      store.getChunkContent(s.documentId, s.chunkIndex),
          })));
        }
      }

      const sysPrompt = getSystemPrompt(selectedRole, hasDocs || !!webCtx, writingMode);
      const history   = (session?.messages || []).filter(m => !m.isLoading).slice(-10)
        .map(m => ({ role: m.role as string, content: m.content }));
      
      let combinedCtx = '';
      if (ctx) combinedCtx += `[Retrieved Document Context]\n${ctx}\n\n`;
      if (webCtx) combinedCtx += webCtx + "\n\n";

      const userContent = combinedCtx ? `${combinedCtx}[User Question]\n${text}` : text;
      const lastIsUser  = history.at(-1)?.role === 'user';
      const msgs        = [...(lastIsUser ? history.slice(0,-1) : history), { role:'user', content:userContent }];

      const res = await fetch('/api/chat', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ messages:msgs, model:settings.selectedModel, apiKeys:settings.apiKeys, currentKeyIndex:settings.currentKeyIndex, systemPrompt:sysPrompt }),
      });

      if (!res.ok) { const d = await res.json().catch(()=>({})); throw new Error(d.error || `API error ${res.status}`); }
      const data    = await res.json();
      const content = data.content || '';

      // Plagiarism check
      let plagResult = undefined;
      if ((writingMode || settings.autoCheckPlagiarism) && content.length > 100 && hasDocs) {
        updateMessage(sid, aiId, { content, isLoading:false, sources, model:data.model, plagiarismResult:{ score:0, matches:[], suggestions:[], isChecking:true } });
        const allChunks = documents.filter(d => d.status==='ready').flatMap(d => d.chunks.map(c => ({ documentName:d.name, content:c.content })));
        plagResult = await checkPlagiarism(content, allChunks);
      }

      updateMessage(sid, aiId, { content, isLoading:false, sources, model:data.model, plagiarismResult: plagResult });
    } catch(e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(msg);
      updateMessage(sid!, aiId, { content:`⚠️ ${msg}`, isLoading:false });
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, hasKeys, hasDocs, currentSessionId, selectedRole, writingMode, settings, documents, session, store, createSession, addMessage, updateMessage]);

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
      <WritingModeBar />

      {/* Messages */}
      <div className="messages-area">
        {messages.length === 0
          ? <WelcomeScreen hasKeys={hasKeys} hasDocs={hasDocs} />
          : <>{messages.map(m => <MessageBubble key={m.id} message={m} />)}<div ref={endRef} /></>
        }
      </div>

      {/* Error */}
      {error && (
        <div className="error-banner">
          <AlertCircle size={14} style={{ flexShrink:0, marginTop:1 }} />
          <span style={{ flex:1 }}>{error}</span>
          <button onClick={() => setError(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'inherit', padding:2 }}><X size={13} /></button>
        </div>
      )}

      {/* Input */}
      <div className="input-area">
        {writingMode && (
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8, fontSize:12, color:'var(--amber-400)' }}>
            <Zap size={12} />
            <span>Writing mode: <strong style={{ textTransform:'capitalize' }}>{writingMode.replace('-',' ')}</strong></span>
          </div>
        )}
        <div className="input-wrapper">
          <button 
            onClick={() => updateSettings({ webSearchEnabled: !settings.webSearchEnabled })}
            title={settings.webSearchEnabled ? "Disable Web Search" : "Enable Web Search"}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '0 8px',
              color: settings.webSearchEnabled ? 'var(--amber-400)' : 'var(--text-4)',
              transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <Globe size={18} style={{ filter: settings.webSearchEnabled ? 'drop-shadow(0 0 4px var(--amber-500))' : 'none' }} />
          </button>
          <textarea ref={taRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={!hasKeys ? 'Add an OpenRouter API key in Settings…' : !hasDocs ? 'Upload documents or ask a general question…' : writingMode ? `Describe your ${writingMode.replace('-',' ')}…` : 'Ask about your research documents…'}
            disabled={streaming || !hasKeys} rows={1} className="input-textarea" />
          <button onClick={send} disabled={!input.trim() || streaming || !hasKeys} className="send-btn">
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

function WelcomeScreen({ hasKeys, hasDocs }: { hasKeys:boolean; hasDocs:boolean }) {
  return (
    <div className="welcome">
      <p className="welcome-title">Poka<span style={{ color:'var(--text-1)' }}>AI</span></p>
      <p className="welcome-sub">Your intelligent MSc research companion — upload papers, ask questions, generate academic writing with full citations.</p>

      <div className="step-cards">
        {[
          { n:'1', done:hasKeys, title:'Add API Keys',       desc:'Open Settings tab → add free OpenRouter keys'         },
          { n:'2', done:hasDocs, title:'Upload Documents',   desc:'Drop PDF, DOCX, TXT, MD, or PPTX files in the Documents panel, or place them in the /public/documents folder and use "Watch Directory"'      },
          { n:'3', done:false,   title:'Start Researching',  desc:'Ask questions, generate writing, check originality'   },
        ].map(s => (
          <div key={s.n} className={`step-card ${s.done ? 'done' : ''}`}>
            <div className="step-num">{s.done ? '✓' : s.n}</div>
            <div>
              <p className="step-info-title">{s.title}</p>
              <p className="step-info-desc">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="prompt-chips">
        {['Summarize the methodology','What are the key findings?','Write a literature review','Identify research gaps','Compare study designs','Paraphrase this section'].map(q => (
          <span key={q} className="prompt-chip">{q}</span>
        ))}
      </div>
    </div>
  );
}
