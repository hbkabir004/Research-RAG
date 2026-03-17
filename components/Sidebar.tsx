'use client';
import { FileText, History, Settings2 } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import DocumentPanel from './DocumentPanel';
import HistoryPanel from './HistoryPanel';
import SettingsPanel from './SettingsPanel';
import RoleSelector from './RoleSelector';

const tabs = [
  { id: 'documents' as const, icon: FileText, label: 'Docs' },
  { id: 'history'   as const, icon: History,  label: 'History'  },
  { id: 'settings'  as const, icon: Settings2, label: 'Settings' },
];

export default function Sidebar() {
  const { activePanel, setActivePanel, documents, settings } = useAppStore();
  const readyDocs = documents.filter(d => d.status === 'ready').length;
  const activeKeys = settings.apiKeys.filter(k => k.status !== 'error').length;

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <h1 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:22, fontWeight:700, color:'var(--amber-400)', lineHeight:1 }}>
          Research<span style={{ color:'var(--text-1)' }}>AI</span>
        </h1>
        <p style={{ fontSize:11, color:'var(--text-4)', marginTop:4 }}>MSc Research Companion</p>
      </div>

      {/* Role selector */}
      <RoleSelector />

      {/* Tabs */}
      <div className="tab-bar">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const badge = tab.id === 'documents' ? readyDocs : tab.id === 'settings' ? activeKeys : 0;
          return (
            <button key={tab.id} onClick={() => setActivePanel(tab.id)}
              className={`tab-btn ${activePanel === tab.id ? 'active' : ''}`}>
              {badge > 0 && <span className="tab-badge">{badge}</span>}
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Panel content */}
      <div className="panel-scroll">
        {activePanel === 'documents' && <DocumentPanel />}
        {activePanel === 'history'   && <HistoryPanel />}
        {activePanel === 'settings'  && <SettingsPanel />}
      </div>
    </aside>
  );
}
