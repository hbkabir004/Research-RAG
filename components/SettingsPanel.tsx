'use client';

import { useState } from 'react';
import { Plus, Trash2, CheckCircle, AlertCircle, Clock, Key, Loader2, ChevronDown } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { ApiKey } from '@/types';

const FREE_MODELS = [
  { id: 'meta-llama/llama-3.3-8b-instruct:free', name: 'Llama 3.3 8B (Free)' },
  { id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Llama 3.1 8B (Free)' },
  { id: 'google/gemma-3-9b-it:free', name: 'Gemma 3 9B (Free)' },
  { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B (Free)' },
  { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1 (Free)' },
  { id: 'qwen/qwen3-8b:free', name: 'Qwen3 8B (Free)' },
];

function KeyStatusIcon({ status }: { status: ApiKey['status'] }) {
  switch (status) {
    case 'active': return <CheckCircle size={14} className="text-[#4aad7a]" />;
    case 'rate-limited': return <Clock size={14} className="text-[#d4a847]" />;
    case 'error': return <AlertCircle size={14} className="text-[#d85555]" />;
    default: return <Key size={14} className="text-[#6b6460]" />;
  }
}

function maskKey(key: string): string {
  if (key.length <= 12) return '•'.repeat(key.length);
  return key.slice(0, 6) + '•'.repeat(10) + key.slice(-4);
}

export default function SettingsPanel() {
  const { settings, addApiKey, removeApiKey, updateApiKeyStatus, updateSettings } = useAppStore();
  const [newKeyInput, setNewKeyInput] = useState('');
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);
  const [addError, setAddError] = useState('');

  const handleAddKey = () => {
    const trimmed = newKeyInput.trim();
    if (!trimmed) { setAddError('Please enter an API key'); return; }
    if (!trimmed.startsWith('sk-or-')) {
      setAddError('OpenRouter keys should start with sk-or-');
    }
    setAddError('');
    addApiKey({
      key: trimmed,
      label: newKeyLabel.trim() || `Key ${settings.apiKeys.length + 1}`,
      status: 'untested',
    });
    setNewKeyInput('');
    setNewKeyLabel('');
  };

  const handleTestKey = async (keyObj: ApiKey) => {
    setTestingKeyId(keyObj.id);
    try {
      const res = await fetch('/api/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: keyObj.key }),
      });
      const data = await res.json();
      if (data.status === 'valid') {
        updateApiKeyStatus(keyObj.id, 'active');
      } else if (data.status === 'rate-limited') {
        updateApiKeyStatus(keyObj.id, 'rate-limited', Date.now() + 60000);
      } else {
        updateApiKeyStatus(keyObj.id, 'error');
      }
    } catch {
      updateApiKeyStatus(keyObj.id, 'error');
    } finally {
      setTestingKeyId(null);
    }
  };

  const activeCount = settings.apiKeys.filter((k) => k.status === 'active').length;
  const totalCount = settings.apiKeys.length;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-4 space-y-6">

        {/* API Keys */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs uppercase tracking-widest font-semibold text-[#6b6460]">OpenRouter Keys</h3>
            {totalCount > 0 && (
              <span className={`text-xs font-mono-custom font-medium ${activeCount > 0 ? 'text-[#4aad7a]' : 'text-[#d85555]'}`}>
                {activeCount}/{totalCount} active
              </span>
            )}
          </div>

          {/* Key list */}
          <div className="space-y-2 mb-4">
            {settings.apiKeys.length === 0 ? (
              <p className="text-xs text-[#6b6460] text-center py-4">No keys added yet</p>
            ) : (
              settings.apiKeys.map((keyObj) => (
                <div
                  key={keyObj.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-[#252d3d] bg-[#0f1219] hover:border-[#252d3d]/80 transition-all"
                >
                  <KeyStatusIcon status={keyObj.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[#f0ede8] leading-none">{keyObj.label}</p>
                    <p className="text-xs text-[#6b6460] font-mono-custom mt-1">{maskKey(keyObj.key)}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleTestKey(keyObj)}
                      disabled={testingKeyId === keyObj.id}
                      className="text-xs px-3 py-1.5 rounded-lg border border-[#252d3d] text-[#a8a098] hover:border-[#d4a847]/50 hover:text-[#d4a847] hover:bg-[#d4a847]/5 transition-all disabled:opacity-50 font-medium"
                    >
                      {testingKeyId === keyObj.id ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : 'Test'}
                    </button>
                    <button
                      onClick={() => removeApiKey(keyObj.id)}
                      className="p-1.5 text-[#6b6460] hover:text-[#d85555] hover:bg-[#d85555]/10 rounded-lg transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add new key */}
          <div className="space-y-2.5">
            <input
              value={newKeyLabel}
              onChange={(e) => setNewKeyLabel(e.target.value)}
              placeholder="Key label (optional)"
              className="w-full px-4 py-2.5 text-xs bg-[#0f1219] border border-[#252d3d] rounded-lg text-[#f0ede8] placeholder-[#6b6460] focus:outline-none focus:border-[#d4a847]/60 focus:shadow-lg focus:shadow-[#d4a847]/10 transition-all"
            />
            <div className="flex gap-2.5">
              <input
                value={newKeyInput}
                onChange={(e) => { setNewKeyInput(e.target.value); setAddError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleAddKey()}
                placeholder="sk-or-v1-..."
                type="password"
                className="flex-1 px-4 py-2.5 text-xs bg-[#0f1219] border border-[#252d3d] rounded-lg text-[#f0ede8] placeholder-[#6b6460] focus:outline-none focus:border-[#d4a847]/60 focus:shadow-lg focus:shadow-[#d4a847]/10 transition-all font-mono-custom"
              />
              <button
                onClick={handleAddKey}
                className="flex items-center gap-2 px-4 py-2.5 text-xs bg-[#d4a847] hover:bg-[#f0c840] text-[#06070c] hover:text-[#06070c] rounded-lg transition-all font-semibold shadow-sm hover:shadow-md hover:shadow-[#d4a847]/30"
              >
                <Plus size={13} />
                Add
              </button>
            </div>
            {addError && <p className="text-xs text-[#d85555] font-medium">{addError}</p>}
            <p className="text-xs text-[#6b6460]">
              Get free keys at{' '}
              <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-[#d4a847] hover:text-[#f0c840] transition-colors">
                openrouter.ai/keys
              </a>
            </p>
          </div>
        </section>

        <div className="gradient-line" />

        {/* Model Selection */}
        <section>
          <h3 className="text-xs uppercase tracking-widest font-semibold text-[#6b6460] mb-4">Language Model</h3>
          <div className="relative">
            <select
              value={settings.selectedModel}
              onChange={(e) => updateSettings({ selectedModel: e.target.value })}
              className="w-full appearance-none px-4 py-2.5 text-xs bg-[#0f1219] border border-[#252d3d] rounded-lg text-[#f0ede8] focus:outline-none focus:border-[#d4a847]/60 focus:shadow-lg focus:shadow-[#d4a847]/10 transition-all cursor-pointer pr-10"
            >
              {FREE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b6460] pointer-events-none" />
          </div>
        </section>

        <div className="gradient-line" />

        {/* RAG Settings */}
        <section>
          <h3 className="text-xs uppercase tracking-widest font-semibold text-[#6b6460] mb-4">RAG Settings</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs font-medium text-[#a8a098]">Chunks per query</label>
                <span className="text-xs text-[#d4a847] font-mono-custom font-semibold">{settings.maxChunksPerQuery}</span>
              </div>
              <input
                type="range" min="3" max="10" step="1"
                value={settings.maxChunksPerQuery}
                onChange={(e) => updateSettings({ maxChunksPerQuery: parseInt(e.target.value) })}
                className="w-full accent-[#d4a847] h-1.5 rounded-lg"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs font-medium text-[#a8a098]">Chunk size (chars)</label>
                <span className="text-xs text-[#d4a847] font-mono-custom font-semibold">{settings.chunkSize}</span>
              </div>
              <input
                type="range" min="400" max="1600" step="100"
                value={settings.chunkSize}
                onChange={(e) => updateSettings({ chunkSize: parseInt(e.target.value) })}
                className="w-full accent-[#d4a847] h-1.5 rounded-lg"
              />
            </div>

            <label className="flex items-center justify-between cursor-pointer p-3 rounded-lg bg-[#0f1219] border border-[#252d3d] hover:border-[#252d3d]/80 transition-all">
              <span className="text-xs font-medium text-[#a8a098]">Auto plagiarism check</span>
              <div
                onClick={() => updateSettings({ autoCheckPlagiarism: !settings.autoCheckPlagiarism })}
                className={`relative w-10 h-6 rounded-full transition-all cursor-pointer ${
                  settings.autoCheckPlagiarism ? 'bg-[#d4a847] shadow-md shadow-[#d4a847]/30' : 'bg-[#252d3d]'
                }`}
              >
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.autoCheckPlagiarism ? 'translate-x-4' : 'translate-x-0.5'
                }`} />
              </div>
            </label>
          </div>
        </section>

      </div>
    </div>
  );
}
