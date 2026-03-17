'use client';
import Sidebar from '@/components/Sidebar';
import ChatInterface from '@/components/ChatInterface';

export default function Home() {
  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>
      <Sidebar />
      <main className="main">
        <div className="topbar">
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--amber-400)', display:'block', boxShadow:'0 0 8px var(--amber-500)' }} />
            <span style={{ fontSize:12, color:'var(--text-3)', fontWeight:500 }}>RAG Pipeline Active</span>
          </div>
          <span style={{ fontSize:11.5, color:'var(--text-4)' }}>
            <kbd style={{ padding:'2px 6px', background:'var(--bg-3)', border:'1px solid var(--border-1)', borderRadius:4, fontSize:11, color:'var(--text-3)' }}>↵</kbd>
            {' '}Send &nbsp;·&nbsp;
            <kbd style={{ padding:'2px 6px', background:'var(--bg-3)', border:'1px solid var(--border-1)', borderRadius:4, fontSize:11, color:'var(--text-3)' }}>⇧↵</kbd>
            {' '}New line
          </span>
        </div>
        <ChatInterface />
      </main>
    </div>
  );
}
