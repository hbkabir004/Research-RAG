'use client';
import { useAppStore } from '@/store/appStore';
import { Trash2, Plus, MessageSquare } from 'lucide-react';
import { ROLES } from '@/lib/prompts/systemPrompts';
import { Role } from '@/types';

export default function HistoryPanel() {
  const { sessions, currentSessionId, setCurrentSession, deleteSession, createSession, selectedRole } = useAppStore();
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border-1)' }}>
        <button onClick={() => createSession(selectedRole)}
          style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'9px 0', borderRadius:8, border:'1.5px dashed var(--border-2)', background:'none', cursor:'pointer', fontSize:12.5, color:'var(--text-3)', fontFamily:'inherit', transition:'all 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor='var(--amber-600)'; (e.currentTarget as HTMLButtonElement).style.color='var(--amber-400)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor='var(--border-2)'; (e.currentTarget as HTMLButtonElement).style.color='var(--text-3)'; }}>
          <Plus size={13} /> New Session
        </button>
      </div>
      <div style={{ flex:1, overflowY:'auto' }}>
        {sessions.length === 0 ? (
          <div style={{ textAlign:'center', padding:'32px 16px' }}>
            <MessageSquare size={28} color="var(--border-2)" style={{ margin:'0 auto 8px' }} />
            <p style={{ fontSize:12, color:'var(--text-4)' }}>No sessions yet</p>
          </div>
        ) : sessions.map(s => {
          const role = ROLES[s.role as Role];
          const isActive = s.id === currentSessionId;
          return (
            <div key={s.id} className={`history-item ${isActive ? 'active' : ''}`}
              onClick={() => setCurrentSession(s.id)}>
              <span style={{ fontSize:16, flexShrink:0 }}>{role?.emoji || '💬'}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:12.5, fontWeight:500, color: isActive ? 'var(--text-1)' : 'var(--text-2)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s.title}</p>
                <p style={{ fontSize:11, color:'var(--text-4)', marginTop:2 }}>
                  {s.messages.length} msg{s.messages.length!==1?'s':''} · {new Date(s.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button onClick={e => { e.stopPropagation(); deleteSession(s.id); }}
                style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-4)', padding:3, flexShrink:0, borderRadius:4, opacity:0.6 }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color='var(--red-400)'; (e.currentTarget as HTMLButtonElement).style.opacity='1'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color='var(--text-4)'; (e.currentTarget as HTMLButtonElement).style.opacity='0.6'; }}>
                <Trash2 size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
