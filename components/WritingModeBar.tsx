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
    <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1e2535] overflow-x-auto">
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <PenLine size={12} className="text-[#c8962a]" />
        <span className="text-xs text-[#5a5448]">Write:</span>
      </div>
      <div className="flex items-center gap-1 flex-nowrap">
        {WRITING_MODES.map((mode) => (
          <button
            key={mode.id}
            onClick={() => setWritingMode(writingMode === mode.id ? null : mode.id)}
            className={`flex-shrink-0 px-2.5 py-1 text-xs rounded-full border transition-all ${
              writingMode === mode.id
                ? 'bg-[#c8962a] border-[#c8962a] text-[#0a0c10] font-medium'
                : 'border-[#1e2535] text-[#5a5448] hover:border-[#3a4a60] hover:text-[#9a9080]'
            }`}
          >
            {mode.short}
          </button>
        ))}
      </div>
      {writingMode && (
        <button
          onClick={() => setWritingMode(null)}
          className="flex-shrink-0 ml-auto p-1 text-[#5a5448] hover:text-[#e8e0d4] transition-colors"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
