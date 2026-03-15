'use client';

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
    <div className="mt-3 rounded-md border border-[#1e2535] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 bg-[#0f1219] hover:bg-[#141820] transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <BookOpen size={11} className="text-[#c8962a]" />
          <span className="text-xs text-[#9a9080]">{sources.length} source{sources.length !== 1 ? 's' : ''} retrieved</span>
        </div>
        {expanded ? <ChevronUp size={12} className="text-[#5a5448]" /> : <ChevronDown size={12} className="text-[#5a5448]" />}
      </button>
      {expanded && (
        <div className="border-t border-[#1e2535] divide-y divide-[#1e2535]">
          {sources.map((src, i) => (
            <div key={i} className="px-3 py-2 bg-[#0a0c10]">
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#c8962a] truncate max-w-[200px]">{src.documentName}</p>
                <span className="text-xs font-mono-custom text-[#5a5448]">
                  §{src.chunkIndex + 1} · {Math.round(src.relevanceScore)}%
                </span>
              </div>
              <p className="text-xs text-[#5a5448] mt-1 leading-relaxed italic">
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
        <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-tr-sm bg-[#1a2035] border border-[#2a3550]">
          <p className="text-sm text-[#e8e0d4] leading-relaxed whitespace-pre-wrap">{message.content}</p>
          <p className="text-xs text-[#3a4050] mt-1 text-right">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-5 animate-fade-in-up">
      {/* Role badge */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#0f1219] border border-[#1e2535]">
          <span className="text-xs">{roleConfig.emoji}</span>
          <span className="text-xs text-[#9a9080]">{roleConfig.label}</span>
        </div>
        {message.model && (
          <span className="text-xs text-[#3a4050] font-mono-custom">
            {message.model.split('/').pop()?.replace(':free', '')}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="group relative pl-3 border-l-2 border-[#1e2535] hover:border-[#c8962a]/40 transition-colors">
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
                      <pre className="bg-[#0f1219] border border-[#1e2535] rounded-md p-3 overflow-x-auto my-3">
                        <code className={`text-xs font-mono-custom text-[#c8962a] ${className}`} {...props}>
                          {children}
                        </code>
                      </pre>
                    ) : (
                      <code className="bg-[#141820] border border-[#1e2535] rounded px-1.5 py-0.5 text-[0.8em] font-mono-custom text-[#e8b040]" {...props}>
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
              className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded text-[#5a5448] hover:text-[#9a9080] hover:bg-[#1e2535]"
            >
              {copied ? <Check size={13} className="text-[#3a9060]" /> : <Copy size={13} />}
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
            <p className="text-xs text-[#2a3040] mt-2">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
