'use client';

import { useAppStore } from '@/store/appStore';
import { MessageSquare, Trash2, Plus } from 'lucide-react';
import { ROLES } from '@/lib/prompts/systemPrompts';
import { Role } from '@/types';

export default function HistoryPanel() {
  const { sessions, currentSessionId, setCurrentSession, deleteSession, createSession, selectedRole } = useAppStore();

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-[#1e2535]">
        <button
          onClick={() => createSession(selectedRole)}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-dashed border-[#1e2535] text-xs text-[#5a5448] hover:border-[#c8962a]/40 hover:text-[#c8962a] transition-all"
        >
          <Plus size={12} />
          New Session
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {sessions.length === 0 ? (
          <p className="text-xs text-[#3a4050] text-center py-6">No sessions yet</p>
        ) : (
          sessions.map((session) => {
            const role = ROLES[session.role as Role];
            const isActive = session.id === currentSessionId;
            return (
              <div
                key={session.id}
                className={`group flex items-start gap-2 px-2.5 py-2 rounded-md cursor-pointer transition-all ${
                  isActive
                    ? 'bg-[#1e2535] text-[#e8e0d4]'
                    : 'text-[#9a9080] hover:bg-[#141820] hover:text-[#e8e0d4]'
                }`}
                onClick={() => setCurrentSession(session.id)}
              >
                <span className="text-sm flex-shrink-0 mt-0.5">{role?.emoji || '💬'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate leading-tight">{session.title}</p>
                  <p className="text-xs text-[#3a4050] mt-0.5">
                    {session.messages.length} msg{session.messages.length !== 1 ? 's' : ''} ·{' '}
                    {new Date(session.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-[#3a4050] hover:text-[#c04040] p-0.5 flex-shrink-0"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
