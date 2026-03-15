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
      <div className="p-3 space-y-5">

        {/* API Keys */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs uppercase tracking-widest text-[#5a5448]">OpenRouter Keys</h3>
            {totalCount > 0 && (
              <span className={`text-xs font-mono-custom ${activeCount > 0 ? 'text-[#3a9060]' : 'text-[#c04040]'}`}>
                {activeCount}/{totalCount} active
              </span>
            )}
          </div>

          {/* Key list */}
          <div className="space-y-1.5 mb-3">
            {settings.apiKeys.length === 0 ? (
              <p className="text-xs text-[#3a4050] text-center py-3">No keys added yet</p>
            ) : (
              settings.apiKeys.map((keyObj) => (
                <div
                  key={keyObj.id}
                  className="flex items-center gap-2 p-2.5 rounded-md border border-[#1e2535] bg-[#0f1219]"
                >
                  <KeyStatusIcon status={keyObj.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#e8e0d4] leading-none">{keyObj.label}</p>
                    <p className="text-xs text-[#3a4050] font-mono-custom mt-0.5">{maskKey(keyObj.key)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleTestKey(keyObj)}
                      disabled={testingKeyId === keyObj.id}
                      className="text-xs px-2 py-0.5 rounded border border-[#1e2535] text-[#9a9080] hover:border-[#c8962a] hover:text-[#c8962a] transition-colors disabled:opacity-50"
                    >
                      {testingKeyId === keyObj.id ? (
                        <Loader2 size={10} className="animate-spin" />
                      ) : 'Test'}
                    </button>
                    <button
                      onClick={() => removeApiKey(keyObj.id)}
                      className="p-1 text-[#3a4050] hover:text-[#c04040] transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add new key */}
          <div className="space-y-2">
            <input
              value={newKeyLabel}
              onChange={(e) => setNewKeyLabel(e.target.value)}
              placeholder="Key label (optional)"
              className="w-full px-3 py-2 text-xs bg-[#0f1219] border border-[#1e2535] rounded-md text-[#e8e0d4] placeholder-[#3a4050] focus:outline-none focus:border-[#c8962a] transition-colors"
            />
            <div className="flex gap-2">
              <input
                value={newKeyInput}
                onChange={(e) => { setNewKeyInput(e.target.value); setAddError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleAddKey()}
                placeholder="sk-or-v1-..."
                type="password"
                className="flex-1 px-3 py-2 text-xs bg-[#0f1219] border border-[#1e2535] rounded-md text-[#e8e0d4] placeholder-[#3a4050] focus:outline-none focus:border-[#c8962a] transition-colors font-mono-custom"
              />
              <button
                onClick={handleAddKey}
                className="flex items-center gap-1 px-3 py-2 text-xs bg-[#1e2535] hover:bg-[#c8962a] text-[#9a9080] hover:text-[#0a0c10] rounded-md transition-all font-medium"
              >
                <Plus size={12} />
                Add
              </button>
            </div>
            {addError && <p className="text-xs text-[#c04040]">{addError}</p>}
            <p className="text-xs text-[#3a4050]">
              Get free keys at{' '}
              <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-[#c8962a] hover:underline">
                openrouter.ai/keys
              </a>
            </p>
          </div>
        </section>

        <div className="gradient-line" />

        {/* Model Selection */}
        <section>
          <h3 className="text-xs uppercase tracking-widest text-[#5a5448] mb-3">Language Model</h3>
          <div className="relative">
            <select
              value={settings.selectedModel}
              onChange={(e) => updateSettings({ selectedModel: e.target.value })}
              className="w-full appearance-none px-3 py-2 text-xs bg-[#0f1219] border border-[#1e2535] rounded-md text-[#e8e0d4] focus:outline-none focus:border-[#c8962a] transition-colors cursor-pointer pr-8"
            >
              {FREE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5a5448] pointer-events-none" />
          </div>
        </section>

        <div className="gradient-line" />

        {/* RAG Settings */}
        <section>
          <h3 className="text-xs uppercase tracking-widest text-[#5a5448] mb-3">RAG Settings</h3>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-[#9a9080]">Chunks per query</label>
                <span className="text-xs text-[#c8962a] font-mono-custom">{settings.maxChunksPerQuery}</span>
              </div>
              <input
                type="range" min="3" max="10" step="1"
                value={settings.maxChunksPerQuery}
                onChange={(e) => updateSettings({ maxChunksPerQuery: parseInt(e.target.value) })}
                className="w-full accent-[#c8962a] h-1 rounded"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-[#9a9080]">Chunk size (chars)</label>
                <span className="text-xs text-[#c8962a] font-mono-custom">{settings.chunkSize}</span>
              </div>
              <input
                type="range" min="400" max="1600" step="100"
                value={settings.chunkSize}
                onChange={(e) => updateSettings({ chunkSize: parseInt(e.target.value) })}
                className="w-full accent-[#c8962a] h-1 rounded"
              />
            </div>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs text-[#9a9080]">Auto plagiarism check</span>
              <div
                onClick={() => updateSettings({ autoCheckPlagiarism: !settings.autoCheckPlagiarism })}
                className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${
                  settings.autoCheckPlagiarism ? 'bg-[#c8962a]' : 'bg-[#1e2535]'
                }`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
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
