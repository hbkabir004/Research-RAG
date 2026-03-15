'use client';

import { useAppStore } from '@/store/appStore';
import { MessageSquare, Trash2, Plus } from 'lucide-react';
import { ROLES } from '@/lib/prompts/systemPrompts';
import { Role } from '@/types';

export default function HistoryPanel() {
  const { sessions, currentSessionId, setCurrentSession, deleteSession, createSession, selectedRole } = useAppStore();

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-[#252d3d]">
        <button
          onClick={() => createSession(selectedRole)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-[#252d3d] text-xs font-medium text-[#6b6460] hover:border-[#d4a847]/50 hover:text-[#d4a847] hover:bg-[#d4a847]/5 transition-all"
        >
          <Plus size={13} />
          New Session
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
        {sessions.length === 0 ? (
          <p className="text-xs text-[#6b6460] text-center py-8">No sessions yet</p>
        ) : (
          sessions.map((session) => {
            const role = ROLES[session.role as Role];
            const isActive = session.id === currentSessionId;
            return (
              <div
                key={session.id}
                className={`group flex items-start gap-3 px-3 py-3 rounded-lg cursor-pointer transition-all ${
                  isActive
                    ? 'bg-[#252d3d]/60 text-[#f0ede8] border border-[#d4a847]/40'
                    : 'text-[#a8a098] hover:bg-[#151a24] hover:text-[#f0ede8] border border-transparent'
                }`}
                onClick={() => setCurrentSession(session.id)}
              >
                <span className="text-lg flex-shrink-0 mt-0.5">{role?.emoji || '💬'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate leading-tight">{session.title}</p>
                  <p className="text-xs text-[#6b6460] mt-1">
                    {session.messages.length} msg{session.messages.length !== 1 ? 's' : ''} · {new Date(session.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-[#6b6460] hover:text-[#d85555] p-1 flex-shrink-0 hover:bg-[#d85555]/10 rounded"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
