'use client';

import { useAppStore } from '@/store/appStore';
import { WritingMode } from '@/types';
import { PenLine, X } from 'lucide-react';

const WRITING_MODES: Array<{ id: WritingMode; label: string; short: string }> = [
  { id: 'literature-review', label: 'Literature Review', short: 'Lit. Review' },
  { id: 'abstract', label: 'Abstract', short: 'Abstract' },
  { id: 'methodology', label: 'Methodology', short: 'Method' },
  { id: 'results', label: 'Results', short: 'Results' },
  { id: 'discussion', label: 'Discussion', short: 'Discussion' },
  { id: 'conclusion', label: 'Conclusion', short: 'Conclusion' },
  { id: 'paraphrase', label: 'Paraphrase', short: 'Paraphrase' },
  { id: 'summarize', label: 'Summarize', short: 'Summarize' },
];

export default function WritingModeBar() {
  const { writingMode, setWritingMode } = useAppStore();

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-[#252d3d] overflow-x-auto bg-[#0f1219]/50">
      <div className="flex items-center gap-2 flex-shrink-0">
        <PenLine size={13} className="text-[#d4a847]" />
        <span className="text-xs font-medium text-[#6b6460]">Write:</span>
      </div>
      <div className="flex items-center gap-1.5 flex-nowrap">
        {WRITING_MODES.map((mode) => (
          <button
            key={mode.id}
            onClick={() => setWritingMode(writingMode === mode.id ? null : mode.id)}
            className={`flex-shrink-0 px-3 py-1.5 text-xs rounded-lg border transition-all font-medium ${
              writingMode === mode.id
                ? 'bg-[#d4a847] border-[#d4a847] text-[#06070c] shadow-md shadow-[#d4a847]/30'
                : 'border-[#252d3d] text-[#6b6460] hover:border-[#d4a847]/40 hover:text-[#d4a847] hover:bg-[#d4a847]/5'
            }`}
          >
            {mode.short}
          </button>
        ))}
      </div>
      {writingMode && (
        <button
          onClick={() => setWritingMode(null)}
          className="flex-shrink-0 ml-auto p-1.5 text-[#6b6460] hover:text-[#d4a847] hover:bg-[#252d3d] rounded-lg transition-all"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}
