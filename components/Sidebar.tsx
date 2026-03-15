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
    <aside className="flex flex-col h-full border-r border-[#1e2535] bg-[#0a0c10]">
      {/* Logo */}
      <div className="px-4 py-3 border-b border-[#1e2535]">
        <h1
          className="text-xl font-semibold text-[#c8962a]"
          style={{ fontFamily: 'Cormorant Garamond, serif' }}
        >
          Research<span className="text-[#e8e0d4]">AI</span>
        </h1>
        <p className="text-xs text-[#3a4050] mt-0.5">MSc Research Companion</p>
      </div>

      {/* Role Selector */}
      <div className="border-b border-[#1e2535]">
        <RoleSelector />
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-[#1e2535]">
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
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors relative ${
                activePanel === tab.id
                  ? 'text-[#c8962a] border-b-2 border-[#c8962a]'
                  : 'text-[#5a5448] hover:text-[#9a9080]'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
              {badge > 0 && (
                <span className="absolute top-1 right-3 w-4 h-4 rounded-full bg-[#c8962a] text-[#0a0c10] text-[9px] font-bold flex items-center justify-center">
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
