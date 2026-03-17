'use client';
import { useState } from 'react';
import { Plus, Trash2, CheckCircle, AlertCircle, Clock, Key, Loader2, ChevronDown } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { ApiKey } from '@/types';

const MODELS = [
  { id:'meta-llama/llama-3.3-8b-instruct:free',  name:'Llama 3.3 8B (Free)'  },
  { id:'meta-llama/llama-3.1-8b-instruct:free',  name:'Llama 3.1 8B (Free)'  },
  { id:'google/gemma-3-9b-it:free',               name:'Gemma 3 9B (Free)'    },
  { id:'mistralai/mistral-7b-instruct:free',      name:'Mistral 7B (Free)'    },
  { id:'deepseek/deepseek-r1:free',               name:'DeepSeek R1 (Free)'   },
  { id:'qwen/qwen3-8b:free',                      name:'Qwen3 8B (Free)'      },
];

const StatusIcon = ({ s }: { s: ApiKey['status'] }) => ({
  active:       <CheckCircle size={13} color="var(--green-400)" />,
  'rate-limited': <Clock size={13} color="var(--amber-400)" />,
  error:        <AlertCircle size={13} color="var(--red-400)" />,
  untested:     <Key size={13} color="var(--text-4)" />,
}[s]);

const mask = (k: string) => k.length <= 12 ? '•'.repeat(k.length) : k.slice(0,6)+'•••••'+k.slice(-4);

export default function SettingsPanel() {
  const { settings, addApiKey, removeApiKey, updateApiKeyStatus, updateSettings } = useAppStore();
  const [keyInput, setKeyInput]   = useState('');
  const [label,    setLabel]      = useState('');
  const [testingId, setTestingId] = useState<string|null>(null);
  const [err, setErr]             = useState('');

  const addKey = () => {
    const k = keyInput.trim();
    if (!k) { setErr('Enter an API key'); return; }
    setErr('');
    addApiKey({ key:k, label: label.trim() || `Key ${settings.apiKeys.length+1}`, status:'untested' });
    setKeyInput(''); setLabel('');
  };

  const testKey = async (ko: ApiKey) => {
    setTestingId(ko.id);
    try {
      const r = await fetch('/api/test-key', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ apiKey:ko.key }) });
      const d = await r.json();
      updateApiKeyStatus(ko.id, d.status === 'valid' ? 'active' : d.status === 'rate-limited' ? 'rate-limited' : 'error', d.status==='rate-limited'?Date.now()+60000:undefined);
    } catch { updateApiKeyStatus(ko.id,'error'); }
    finally { setTestingId(null); }
  };

  const active = settings.apiKeys.filter(k => k.status==='active').length;

  return (
    <div style={{ paddingBottom:20 }}>

      {/* API Keys */}
      <div className="settings-section">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <p className="settings-label" style={{ marginBottom:0 }}>OpenRouter Keys</p>
          {settings.apiKeys.length > 0 && (
            <span style={{ fontSize:11, fontFamily:'JetBrains Mono,monospace', color: active>0 ? 'var(--green-400)' : 'var(--red-400)' }}>
              {active}/{settings.apiKeys.length} active
            </span>
          )}
        </div>

        {settings.apiKeys.length === 0 ? (
          <p style={{ fontSize:12, color:'var(--text-4)', textAlign:'center', padding:'12px 0' }}>No keys added yet</p>
        ) : (
          <div style={{ marginBottom:10 }}>
            {settings.apiKeys.map(ko => (
              <div key={ko.id} className="key-item">
                <StatusIcon s={ko.status} />
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:12.5, fontWeight:500, color:'var(--text-1)' }}>{ko.label}</p>
                  <p style={{ fontSize:10.5, color:'var(--text-4)', fontFamily:'JetBrains Mono,monospace', marginTop:1 }}>{mask(ko.key)}</p>
                </div>
                <button onClick={() => testKey(ko)} disabled={testingId===ko.id} className="btn-ghost" style={{ fontSize:11, padding:'4px 8px' }}>
                  {testingId===ko.id ? <Loader2 size={11} style={{ animation:'spin 1s linear infinite' }} /> : 'Test'}
                </button>
                <button onClick={() => removeApiKey(ko.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-4)', padding:4, borderRadius:4 }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color='var(--red-400)'}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color='var(--text-4)'}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Label (optional)" className="input-field" style={{ fontSize:12 }} />
          <div style={{ display:'flex', gap:6 }}>
            <input value={keyInput} onChange={e => { setKeyInput(e.target.value); setErr(''); }}
              onKeyDown={e => e.key==='Enter' && addKey()}
              placeholder="sk-or-v1-…" type="password"
              className="input-field" style={{ flex:1, fontSize:12, fontFamily:'JetBrains Mono,monospace' }} />
            <button onClick={addKey} className="btn-primary" style={{ padding:'8px 12px', whiteSpace:'nowrap' }}>
              <Plus size={13} /> Add
            </button>
          </div>
          {err && <p style={{ fontSize:11.5, color:'var(--red-400)' }}>{err}</p>}
          <p style={{ fontSize:11, color:'var(--text-4)', lineHeight:1.5 }}>
            Free keys at{' '}
            <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer"
              style={{ color:'var(--amber-400)', textDecoration:'underline' }}>openrouter.ai/keys</a>
          </p>
        </div>
      </div>

      <div className="settings-divider" />

      {/* Model */}
      <div className="settings-section" style={{ paddingTop:14 }}>
        <p className="settings-label">Language Model</p>
        <div className="select-wrapper">
          <select value={settings.selectedModel} onChange={e => updateSettings({ selectedModel:e.target.value })} className="select-field">
            {MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <ChevronDown size={13} className="select-arrow" />
        </div>
      </div>

      <div className="settings-divider" />

      {/* RAG */}
      <div className="settings-section" style={{ paddingTop:14 }}>
        <p className="settings-label">RAG Settings</p>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          <div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontSize:12.5, color:'var(--text-2)' }}>Chunks per query</span>
              <span style={{ fontSize:12, fontFamily:'JetBrains Mono,monospace', color:'var(--amber-400)' }}>{settings.maxChunksPerQuery}</span>
            </div>
            <input type="range" min={3} max={10} step={1} value={settings.maxChunksPerQuery}
              onChange={e => updateSettings({ maxChunksPerQuery: +e.target.value })}
              style={{ width:'100%' }} />
          </div>

          <div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontSize:12.5, color:'var(--text-2)' }}>Chunk size</span>
              <span style={{ fontSize:12, fontFamily:'JetBrains Mono,monospace', color:'var(--amber-400)' }}>{settings.chunkSize}</span>
            </div>
            <input type="range" min={400} max={1600} step={100} value={settings.chunkSize}
              onChange={e => updateSettings({ chunkSize: +e.target.value })}
              style={{ width:'100%' }} />
          </div>

          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontSize:12.5, color:'var(--text-2)' }}>Auto plagiarism check</span>
            <div className={`toggle-track ${settings.autoCheckPlagiarism ? 'on' : ''}`}
              onClick={() => updateSettings({ autoCheckPlagiarism: !settings.autoCheckPlagiarism })}>
              <div className="toggle-thumb" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
