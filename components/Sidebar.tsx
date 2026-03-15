'use client';

import { FileText, History, Settings2 } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import DocumentPanel from './DocumentPanel';
import HistoryPanel from './HistoryPanel';
import SettingsPanel from './SettingsPanel';
import RoleSelector from './RoleSelector';

const tabs = [
  { id: 'documents' as const, icon: FileText, label: 'Docs' },
  { id: 'history' as const, icon: History, label: 'History' },
  { id: 'settings' as const, icon: Settings2, label: 'Settings' },
];

export default function Sidebar() {
  const { activePanel, setActivePanel, documents, settings } = useAppStore();

  const readyDocCount = documents.filter((d) => d.status === 'ready').length;
  const keyCount = settings.apiKeys.filter((k) => k.status !== 'error').length;

  return (
    <aside className="flex flex-col h-full bg-[#06070c]">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-[#252d3d] bg-gradient-to-b from-[#0f1219] to-[#06070c]">
        <h1
          className="text-xl font-semibold text-[#d4a847] tracking-tight"
          style={{ fontFamily: 'Cormorant Garamond, serif' }}
        >
          Research<span className="text-[#f0ede8]">AI</span>
        </h1>
        <p className="text-xs text-[#6b6460] mt-1 font-medium">MSc Research Companion</p>
      </div>

      {/* Role Selector */}
      <div className="border-b border-[#252d3d]">
        <RoleSelector />
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-[#252d3d] bg-[#0f1219]/50">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const badge =
            tab.id === 'documents' ? readyDocCount :
            tab.id === 'settings' ? keyCount :
            0;
          return (
            <button
              key={tab.id}
              onClick={() => setActivePanel(tab.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-xs transition-all relative font-medium ${
                activePanel === tab.id
                  ? 'text-[#d4a847] border-b-2 border-[#d4a847]'
                  : 'text-[#6b6460] hover:text-[#a8a098]'
              }`}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
              {badge > 0 && (
                <span className="absolute top-1.5 right-2 w-4 h-4 rounded-full bg-[#d4a847] text-[#06070c] text-[9px] font-bold flex items-center justify-center shadow-sm">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-hidden">
        {activePanel === 'documents' && <DocumentPanel />}
        {activePanel === 'history' && <HistoryPanel />}
        {activePanel === 'settings' && <SettingsPanel />}
      </div>
    </aside>
  );
}
