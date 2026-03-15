'use client';

// HMR reset marker - v2-modern-ui-ux
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Message, SourceCitation } from '@/types';
import { ROLES } from '@/lib/prompts/systemPrompts';
import { Copy, ChevronDown, ChevronUp, BookOpen, Check } from 'lucide-react';
import PlagiarismPanel from './PlagiarismPanel';
import { useAppStore } from '@/store/appStore';

interface Props {
  message: Message;
}

function LoadingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-[#c8962a] loading-dot"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  );
}

function SourcesPanel({ sources }: { sources: SourceCitation[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-4 rounded-lg border border-[#252d3d] overflow-hidden bg-[#0f1219]/40">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#0f1219]/60 hover:bg-[#151a24] transition-all"
      >
        <div className="flex items-center gap-2">
          <BookOpen size={12} className="text-[#d4a847]" />
          <span className="text-xs font-medium text-[#a8a098]">{sources.length} source{sources.length !== 1 ? 's' : ''} retrieved</span>
        </div>
        {expanded ? <ChevronUp size={13} className="text-[#6b6460]" /> : <ChevronDown size={13} className="text-[#6b6460]" />}
      </button>
      {expanded && (
        <div className="border-t border-[#252d3d] divide-y divide-[#252d3d]">
          {sources.map((src, i) => (
            <div key={i} className="px-4 py-3 bg-[#06070c] hover:bg-[#0f1219]/50 transition-colors">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-[#d4a847] truncate max-w-[200px]">{src.documentName}</p>
                <span className="text-xs font-mono-custom text-[#6b6460]">
                  §{src.chunkIndex + 1} · {Math.round(src.relevanceScore)}%
                </span>
              </div>
              <p className="text-xs text-[#a8a098] mt-2 leading-relaxed italic">
                "{src.excerpt}"
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MessageBubble({ message }: Props) {
  const { selectedRole } = useAppStore();
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const roleConfig = ROLES[selectedRole];

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <div className="flex justify-end mb-4 animate-fade-in-up">
        <div className="max-w-[80%] px-5 py-3 rounded-2xl rounded-tr-sm bg-[#1a232f] border border-[#2a3d52] shadow-sm hover:shadow-md hover:shadow-[#d4a847]/5 transition-all">
          <p className="text-sm text-[#f0ede8] leading-relaxed whitespace-pre-wrap">{message.content}</p>
          <p className="text-xs text-[#6b6460] mt-1.5 text-right">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 animate-fade-in-up">
      {/* Role badge */}
      <div className="flex items-center gap-2 mb-2.5">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0f1219] border border-[#252d3d] hover:border-[#d4a847]/40 transition-colors">
          <span className="text-xs">{roleConfig.emoji}</span>
          <span className="text-xs font-medium text-[#a8a098]">{roleConfig.label}</span>
        </div>
        {message.model && (
          <span className="text-xs text-[#6b6460] font-mono-custom">
            {message.model.split('/').pop()?.replace(':free', '')}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="group relative pl-4 border-l-2 border-[#252d3d] hover:border-[#d4a847]/50 transition-colors">
        {message.isLoading ? (
          <LoadingDots />
        ) : (
          <>
            <div className="prose-research">
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  // Custom code block rendering
                  code({ className, children, ...props }) {
                    const isBlock = className?.includes('language-');
                    return isBlock ? (
                      <pre className="bg-[#0f1219] border border-[#252d3d] rounded-lg p-4 overflow-x-auto my-4">
                        <code className={`text-xs font-mono-custom text-[#d4a847] ${className}`} {...props}>
                          {children}
                        </code>
                      </pre>
                    ) : (
                      <code className="bg-[#151a24] border border-[#252d3d] rounded px-2 py-1 text-[0.8em] font-mono-custom text-[#f0c840]" {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>

            {/* Copy button */}
            <button
              onClick={handleCopy}
              className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg text-[#6b6460] hover:text-[#d4a847] hover:bg-[#252d3d]"
            >
              {copied ? <Check size={14} className="text-[#4aad7a]" /> : <Copy size={14} />}
            </button>

            {/* Sources */}
            {message.sources && message.sources.length > 0 && (
              <SourcesPanel sources={message.sources} />
            )}

            {/* Plagiarism result */}
            {message.plagiarismResult && (
              <div className="mt-3">
                <PlagiarismPanel result={message.plagiarismResult} />
              </div>
            )}

            {/* Timestamp */}
            <p className="text-xs text-[#6b6460] mt-3">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
