'use client';

import Sidebar from '@/components/Sidebar';
import ChatInterface from '@/components/ChatInterface';

export default function Home() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#06070c]">
      <div className="w-64 flex-shrink-0 border-r border-[#252d3d]">
        <Sidebar />
      </div>
      <main className="flex-1 min-w-0 flex flex-col bg-[#06070c]">
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#252d3d] flex-shrink-0 bg-gradient-to-b from-[#0f1219] to-[#06070c]">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-[#d4a847] animate-pulse-amber" />
            <span className="text-xs font-medium text-[#a8a098]">RAG Pipeline Active</span>
          </div>
          <span className="text-xs text-[#6b6460]">
            Shift+Enter for new line · Enter to send
          </span>
        </header>
        <div className="flex-1 overflow-hidden">
          <ChatInterface />
        </div>
      </main>
    </div>
  );
}
