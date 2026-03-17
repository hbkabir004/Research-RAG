'use client';

import Sidebar from '@/components/Sidebar';
import ChatInterface from '@/components/ChatInterface';

export default function Home() {
  return (
    <div className="flex h-screen overflow-hidden">
      <div className="w-64 flex-shrink-0">
        <Sidebar />
      </div>
      <main className="flex-1 min-w-0 flex flex-col bg-[#f8f7f5]">
        <header className="flex items-center justify-between px-6 py-3 border-b border-[#e5dfd6] flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#c8962a] animate-pulse" />
            <span className="text-xs text-[#6b6460]">RAG Pipeline Active</span>
          </div>
          <span className="text-xs text-[#a39a91]">
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
