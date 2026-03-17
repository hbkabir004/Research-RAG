'use client';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Message } from '@/types';
import { ROLES } from '@/lib/prompts/systemPrompts';
import { Copy, ChevronDown, ChevronUp, BookOpen, Check } from 'lucide-react';
import PlagiarismPanel from './PlagiarismPanel';
import { useAppStore } from '@/store/appStore';

export default function MessageBubble({ message }: { message: Message }) {
  const { selectedRole } = useAppStore();
  const [copied, setCopied] = useState(false);
  const [srcOpen, setSrcOpen] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (message.role === 'user') {
    return (
      <div className="msg-user animate-up">
        <div className="msg-user-bubble">{message.content}</div>
      </div>
    );
  }

  const role = ROLES[selectedRole];

  return (
    <div className="msg-assistant animate-up">
      {/* Role badge */}
      <div className="msg-role-badge">
        <span style={{ fontSize:13 }}>{role.emoji}</span>
        <span style={{ fontSize:11.5, fontWeight:500, color:'var(--text-3)' }}>{role.label}</span>
        {message.model && (
          <span style={{ fontSize:10, color:'var(--text-4)', fontFamily:'JetBrains Mono,monospace', marginLeft:2 }}>
            · {message.model.split('/').pop()?.replace(':free','')}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="msg-content" style={{ 
        maxWidth: '85%',
        width: 'fit-content',
        padding: '12px 16px',
        borderRadius: 16,
        background: 'var(--bg-1)',
        color: 'var(--text-1)',
        border: '1px solid var(--border-1)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
        fontSize: 14,
        lineHeight: 1.5,
        position: 'relative'
      }}>
        {message.isLoading ? (
          <div style={{ display:'flex', gap:6, padding:'4px 0', alignItems:'center' }}>
            <span className="dot" /><span className="dot" /><span className="dot" />
          </div>
        ) : (
          <>
            <div style={{ position:'relative' }}>
              <div className="prose">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}
                  components={{
                    code({ className, children, ...props }) {
                      const isBlock = !!className?.includes('language-');
                      return isBlock
                        ? <pre style={{ background:'var(--bg-2)', border:'1px solid var(--border-1)', borderRadius:8, padding:14, overflowX:'auto', margin:'12px 0' }}>
                            <code style={{ fontFamily:'JetBrains Mono,monospace', fontSize:13, color:'var(--text-1)' }} {...props}>{children}</code>
                          </pre>
                        : <code style={{ fontFamily:'JetBrains Mono,monospace', fontSize:12.5, background:'var(--bg-3)', border:'1px solid var(--border-1)', padding:'2px 6px', borderRadius:4, color:'var(--amber-400)' }} {...props}>{children}</code>;
                    }
                  }}>
                  {message.content}
                </ReactMarkdown>
              </div>
              <button onClick={copy}
                style={{ position:'absolute', top:0, right:0, background:'none', border:'none', cursor:'pointer', color: copied ? 'var(--green-400)' : 'var(--text-4)', padding:4, borderRadius:4, transition:'all 0.15s', opacity:0.7 }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity='1'}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity='0.7'}>
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </div>

            {/* Sources */}
            {message.sources && message.sources.length > 0 && (
              <div className="sources-block">
                <button className="sources-toggle" onClick={() => setSrcOpen(!srcOpen)}>
                  <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                    <BookOpen size={12} color="var(--amber-500)" />
                    <span style={{ fontSize:12, fontWeight:500 }}>{message.sources.length} source{message.sources.length!==1?'s':''} retrieved</span>
                  </div>
                  {srcOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
                {srcOpen && message.sources.map((src,i) => (
                  <div key={i} className="source-item">
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:12, color:'var(--amber-400)', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'75%' }}>{src.documentName}</span>
                      <span style={{ fontSize:11, fontFamily:'JetBrains Mono,monospace', color:'var(--text-4)' }}>§{src.chunkIndex+1} · {Math.round(src.relevanceScore)}%</span>
                    </div>
                    <p style={{ fontSize:12, color:'var(--text-4)', fontStyle:'italic', lineHeight:1.55 }}>"{src.excerpt}"</p>
                  </div>
                ))}
              </div>
            )}

            {/* Plagiarism */}
            {message.plagiarismResult && <PlagiarismPanel result={message.plagiarismResult} />}

            <p style={{ fontSize:11, color:'var(--text-4)', marginTop:10 }}>
              {new Date(message.timestamp).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
