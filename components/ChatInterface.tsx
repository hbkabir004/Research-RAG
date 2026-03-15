'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Zap, AlertCircle } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { getVectorStore } from '@/lib/rag/vectorStore';
import { getSystemPrompt } from '@/lib/prompts/systemPrompts';
import { checkPlagiarism } from '@/lib/plagiarism/checker';
import { formatChunksForContext } from '@/lib/rag/chunker';
import { Message, SourceCitation } from '@/types';
import MessageBubble from './MessageBubble';
import WritingModeBar from './WritingModeBar';

function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export default function ChatInterface() {
  const {
    settings,
    documents,
    sessions,
    currentSessionId,
    createSession,
    addMessage,
    updateMessage,
    selectedRole,
    writingMode,
  } = useAppStore();

  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const vectorStore = getVectorStore();

  // Get or create current session
  const currentSession = sessions.find((s) => s.id === currentSessionId);
  const messages = currentSession?.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 180) + 'px';
    }
  }, [input]);

  const hasDocuments = documents.some((d) => d.status === 'ready');
  const hasKeys = settings.apiKeys.length > 0;

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    if (!hasKeys) {
      setError('Please add an OpenRouter API key in Settings to start chatting.');
      return;
    }

    setError(null);
    setInput('');

    // Ensure we have a session
    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = createSession(selectedRole);
    }

    // Add user message
    const userMsg: Message = {
      id: generateMessageId(),
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };
    addMessage(sessionId, userMsg);

    // Add loading assistant message
    const assistantMsgId = generateMessageId();
    const loadingMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isLoading: true,
    };
    addMessage(sessionId, loadingMsg);
    setIsStreaming(true);

    try {
      // RAG retrieval
      let sources: SourceCitation[] = [];
      let contextBlock = '';

      if (hasDocuments && vectorStore.getSize() > 0) {
        sources = vectorStore.search(trimmed, settings.maxChunksPerQuery);

        if (sources.length > 0) {
          const chunkContents = sources.map((src) => ({
            documentName: src.documentName,
            chunkIndex: src.chunkIndex,
            content: vectorStore.getChunkContent(src.documentId, src.chunkIndex),
          }));
          contextBlock = formatChunksForContext(chunkContents);
        }
      }

      // Build system prompt
      const systemPrompt = getSystemPrompt(selectedRole, hasDocuments, writingMode);

      // Build messages for API
      const history = (currentSession?.messages || [])
        .filter((m) => !m.isLoading)
        .slice(-10) // last 10 messages for context window
        .map((m) => ({ role: m.role as string, content: m.content }));

      // Construct the full user message with context
      const userContent = contextBlock
        ? `[Retrieved Context]\n${contextBlock}\n\n[User Question]\n${trimmed}`
        : trimmed;

      const apiMessages = [
        ...history.slice(0, -0),
        { role: 'user', content: userContent },
      ];

      // Remove the last user message since we're adding userContent
      const filteredHistory = history.filter(
        (_, i) => i !== history.length - 1 || history[history.length - 1]?.role !== 'user'
      );

      const finalMessages = [
        ...filteredHistory,
        { role: 'user', content: userContent },
      ];

      // Call OpenRouter API via local route
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: finalMessages,
          model: settings.selectedModel,
          apiKeys: settings.apiKeys,
          currentKeyIndex: settings.currentKeyIndex,
          systemPrompt,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `API error: ${response.status}`);
      }

      const data = await response.json();
      const content: string = data.content || '';

      // Run plagiarism check if writing mode active or auto-check enabled
      let plagiarismResult = undefined;
      if (
        (writingMode || settings.autoCheckPlagiarism) &&
        content.length > 100 &&
        hasDocuments
      ) {
        const allChunks = documents
          .filter((d) => d.status === 'ready')
          .flatMap((d) =>
            d.chunks.map((c) => ({ documentName: d.name, content: c.content }))
          );

        // Show checking state immediately
        updateMessage(sessionId, assistantMsgId, {
          content,
          isLoading: false,
          sources,
          model: data.model,
          plagiarismResult: { score: 0, matches: [], suggestions: [], isChecking: true },
        });

        const plagResult = await checkPlagiarism(content, allChunks);
        plagiarismResult = plagResult;
      }

      // Final update
      updateMessage(sessionId, assistantMsgId, {
        content,
        isLoading: false,
        sources,
        model: data.model,
        plagiarismResult: plagiarismResult ?? undefined,
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Something went wrong';
      setError(errMsg);
      updateMessage(sessionId!, assistantMsgId, {
        content: `⚠️ Error: ${errMsg}`,
        isLoading: false,
      });
    } finally {
      setIsStreaming(false);
    }
  }, [
    input, isStreaming, hasKeys, hasDocuments,
    currentSessionId, selectedRole, writingMode,
    settings, documents, currentSession, vectorStore,
    createSession, addMessage, updateMessage,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Writing mode bar */}
      <WritingModeBar />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 ? (
          <WelcomeScreen hasDocuments={hasDocuments} hasKeys={hasKeys} />
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mb-2 flex items-start gap-2 px-3 py-2 rounded-md bg-[#1a0f0f] border border-[#4a2020] text-xs text-[#c04040]">
          <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-[#5a5448] hover:text-[#9a9080]">✕</button>
        </div>
      )}

      {/* Input area */}
      <div className="px-4 pb-4 pt-2">
        {writingMode && (
          <div className="mb-2 flex items-center gap-1.5 text-xs text-[#c8962a]">
            <Zap size={11} />
            <span>Writing mode: <strong>{writingMode.replace('-', ' ')}</strong> — describe what you need</span>
          </div>
        )}
        <div className="flex items-end gap-2 rounded-xl border border-[#1e2535] bg-[#0f1219] px-3 py-2 focus-within:border-[#c8962a]/50 transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              !hasKeys
                ? 'Add an API key in Settings to start…'
                : !hasDocuments
                ? 'Upload documents or ask a general research question…'
                : writingMode
                ? `Describe what to write for your ${writingMode.replace('-', ' ')}…`
                : 'Ask about your research documents…'
            }
            disabled={isStreaming || !hasKeys}
            rows={1}
            className="flex-1 bg-transparent text-sm text-[#e8e0d4] placeholder-[#3a4050] resize-none focus:outline-none leading-relaxed py-1 disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming || !hasKeys}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-[#c8962a] hover:bg-[#e8b040] disabled:opacity-30 disabled:cursor-not-allowed transition-all mb-0.5"
          >
            <Send size={14} className="text-[#0a0c10]" />
          </button>
        </div>
        <p className="text-xs text-[#2a3040] mt-1.5 text-center">
          ↵ Send · Shift+↵ New line{isStreaming ? ' · Generating…' : ''}
        </p>
      </div>
    </div>
  );
}

function WelcomeScreen({ hasDocuments, hasKeys }: { hasDocuments: boolean; hasKeys: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center select-none">
      <div className="mb-6">
        <h2 className="font-display text-4xl text-[#c8962a] mb-2" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          Research AI
        </h2>
        <p className="text-sm text-[#5a5448] max-w-xs">
          Your intelligent MSc research companion powered by retrieval-augmented generation
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 w-full max-w-md">
        <Step
          num="1"
          done={hasKeys}
          title="Add API Keys"
          desc="Open Settings → add free OpenRouter keys"
        />
        <Step
          num="2"
          done={hasDocuments}
          title="Upload Documents"
          desc="Drop .pdf or .docx files in the Documents panel"
        />
        <Step
          num="3"
          done={false}
          title="Start Researching"
          desc="Ask questions, request writing, check originality"
        />
      </div>

      <div className="mt-8 flex flex-wrap gap-2 justify-center max-w-md">
        {[
          'Summarize the methodology section',
          'What are the key findings?',
          'Write a literature review',
          'Check for research gaps',
        ].map((q) => (
          <span
            key={q}
            className="text-xs px-3 py-1.5 rounded-full border border-[#1e2535] text-[#5a5448] hover:border-[#c8962a]/40 hover:text-[#9a9080] transition-colors cursor-default"
          >
            {q}
          </span>
        ))}
      </div>
    </div>
  );
}

function Step({ num, done, title, desc }: { num: string; done: boolean; title: string; desc: string }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${done ? 'border-[#3a9060]/30 bg-[#0a1a10]' : 'border-[#1e2535] bg-[#0f1219]'}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${done ? 'bg-[#3a9060] text-white' : 'bg-[#1e2535] text-[#5a5448]'}`}>
        {done ? '✓' : num}
      </div>
      <div className="text-left">
        <p className={`text-xs font-medium ${done ? 'text-[#3a9060]' : 'text-[#9a9080]'}`}>{title}</p>
        <p className="text-xs text-[#3a4050]">{desc}</p>
      </div>
    </div>
  );
}
