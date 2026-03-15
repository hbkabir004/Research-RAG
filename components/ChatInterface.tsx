'use client';

// HMR reset marker - v2-modern-ui-ux
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
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-1">
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
        <div className="mx-4 mb-3 flex items-start gap-2.5 px-4 py-3 rounded-lg bg-[#1a0f0f] border border-[#5a3030] text-xs text-[#d85555] backdrop-blur-sm animate-fade-in">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span className="flex-1 leading-relaxed">{error}</span>
          <button onClick={() => setError(null)} className="text-[#6b6460] hover:text-[#a8a098] transition-colors flex-shrink-0">✕</button>
        </div>
      )}

      {/* Input area */}
      <div className="px-5 pb-5 pt-3 border-t border-[#252d3d] bg-gradient-to-t from-[#06070c] to-transparent">
        {writingMode && (
          <div className="mb-3 flex items-center gap-1.5 text-xs text-[#d4a847] font-medium px-1">
            <Zap size={12} />
            <span>Writing mode: <strong>{writingMode.replace('-', ' ')}</strong> — describe what you need</span>
          </div>
        )}
        <div className="flex items-end gap-2.5 rounded-xl border border-[#252d3d] bg-[#0f1219] px-4 py-3 focus-within:border-[#d4a847]/60 focus-within:shadow-lg focus-within:shadow-[#d4a847]/10 transition-all">
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
            className="flex-1 bg-transparent text-sm text-[#f0ede8] placeholder-[#6b6460] resize-none focus:outline-none leading-relaxed py-1 disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming || !hasKeys}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-[#d4a847] hover:bg-[#f0c840] disabled:opacity-25 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md hover:shadow-[#d4a847]/30 mb-0.5"
          >
            <Send size={14} className="text-[#06070c] font-medium" />
          </button>
        </div>
        <p className="text-xs text-[#6b6460] mt-2 text-center">
          ↵ Send · Shift+↵ New line{isStreaming ? ' · Generating…' : ''}
        </p>
      </div>
    </div>
  );
}

function WelcomeScreen({ hasDocuments, hasKeys }: { hasDocuments: boolean; hasKeys: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center select-none">
      <div className="mb-8 animate-fade-in">
        <h2 className="font-display text-5xl text-[#d4a847] mb-3 font-semibold tracking-tight" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          Research AI
        </h2>
        <p className="text-base text-[#a8a098] max-w-sm leading-relaxed">
          Your intelligent MSc research companion powered by retrieval-augmented generation
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 w-full max-w-md">
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

      <div className="mt-10 flex flex-wrap gap-2 justify-center max-w-md">
        {[
          'Summarize the methodology section',
          'What are the key findings?',
          'Write a literature review',
          'Check for research gaps',
        ].map((q) => (
          <span
            key={q}
            className="text-xs px-3 py-2 rounded-lg border border-[#252d3d] text-[#a8a098] hover:border-[#d4a847]/50 hover:text-[#d4a847] hover:bg-[#d4a847]/5 transition-all cursor-default"
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
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${done ? 'border-[#4aad7a]/40 bg-[#051410]' : 'border-[#252d3d] bg-[#0f1219]'}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${done ? 'bg-[#4aad7a] text-white shadow-lg shadow-[#4aad7a]/30' : 'bg-[#252d3d] text-[#a8a098]'}`}>
        {done ? '✓' : num}
      </div>
      <div className="text-left">
        <p className={`text-xs font-semibold ${done ? 'text-[#4aad7a]' : 'text-[#a8a098]'}`}>{title}</p>
        <p className="text-xs text-[#6b6460]">{desc}</p>
      </div>
    </div>
  );
}
