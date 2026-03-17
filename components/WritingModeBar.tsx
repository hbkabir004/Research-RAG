'use client';
import { useAppStore } from '@/store/appStore';
import { WritingMode } from '@/types';
import { PenLine, X } from 'lucide-react';

const MODES: Array<{ id: WritingMode; label: string }> = [
  { id: 'literature-review', label: 'Lit. Review' },
  { id: 'abstract',          label: 'Abstract'   },
  { id: 'methodology',       label: 'Method'     },
  { id: 'results',           label: 'Results'    },
  { id: 'discussion',        label: 'Discussion' },
  { id: 'conclusion',        label: 'Conclusion' },
  { id: 'paraphrase',        label: 'Paraphrase' },
  { id: 'summarize',         label: 'Summarize'  },
];

export default function WritingModeBar() {
  const { writingMode, setWritingMode } = useAppStore();
  return (
    <div className="writing-bar">
      <PenLine size={13} color="var(--amber-500)" style={{ flexShrink:0 }} />
      <span style={{ fontSize:11, color:'var(--text-3)', fontWeight:600, flexShrink:0, marginRight:2 }}>Write:</span>
      {MODES.map(m => (
        <button key={m.id as string}
          onClick={() => setWritingMode(writingMode === m.id ? null : m.id)}
          className={`writing-pill ${writingMode === m.id ? 'active' : ''}`}>
          {m.label}
        </button>
      ))}
      {writingMode && (
        <button onClick={() => setWritingMode(null)} style={{ marginLeft:'auto', flexShrink:0, background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', display:'flex' }}>
          <X size={14} />
        </button>
      )}
    </div>
  );
}
