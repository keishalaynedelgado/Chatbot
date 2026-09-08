import React, { useState } from 'react';
import ModalShell from './ModalShell.jsx';
import { CONFIG } from '../../config.js';
import { StorageService } from '../../services/storage.js';
import { Helpers } from '../../utils/helpers.js';

export default function SettingsModal({ onClose, isDark, onToggleDarkMode }) {
  const initial = StorageService.getSettings();
  const [model, setModel] = useState(initial.model);
  const [nvidiaKey, setNvidiaKey] = useState(initial.nvidiaKey || '');
  const [geminiKey, setGeminiKey] = useState(initial.geminiKey || '');
  const [openaiKey, setOpenaiKey] = useState(initial.openaiKey || '');
  const [temperature, setTemperature] = useState(initial.temperature || 0.7);
  const [systemPrompt, setSystemPrompt] = useState(initial.systemPrompt || CONFIG.DEFAULT_SYSTEM_PROMPT);
  const [showNvidia, setShowNvidia] = useState(false);
  const [showGemini, setShowGemini] = useState(false);
  const [showOpenai, setShowOpenai] = useState(false);

  const handleSave = () => {
    StorageService.saveSettings({
      model,
      nvidiaKey: nvidiaKey.trim(),
      geminiKey: geminiKey.trim(),
      openaiKey: openaiKey.trim(),
      temperature: parseFloat(temperature),
      systemPrompt: systemPrompt.trim()
    });
    Helpers.showToast('Settings saved successfully!');
    onClose();
  };

  const handleReset = () => {
    StorageService.saveSettings({
      model: CONFIG.DEFAULT_MODEL,
      nvidiaKey: '',
      geminiKey: '',
      openaiKey: '',
      temperature: 0.7,
      systemPrompt: CONFIG.DEFAULT_SYSTEM_PROMPT
    });
    setModel(CONFIG.DEFAULT_MODEL);
    setNvidiaKey('');
    setGeminiKey('');
    setOpenaiKey('');
    setTemperature(0.7);
    setSystemPrompt(CONFIG.DEFAULT_SYSTEM_PROMPT);
    Helpers.showToast('Settings reset to defaults');
  };

  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container-low">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">settings</span>
          <h3 className="font-headline-md text-lg font-bold text-on-surface">Settings & AI Configuration</h3>
        </div>
        <button onClick={onClose} className="p-1 text-on-surface-variant hover:text-on-surface rounded-lg hover:bg-surface-container-high transition-colors">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <div className="p-6 overflow-y-auto flex flex-col gap-4">
        <div>
          <label className="block font-label-md text-label-md font-semibold text-on-surface mb-1">AI Model</label>
          <select
            className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-primary"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            {CONFIG.MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.name} ({m.provider})</option>
            ))}
          </select>
          <p className="text-xs text-on-surface-variant mt-1">Select the AI intelligence engine.</p>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="font-label-md text-label-md font-semibold text-on-surface">NVIDIA NIM API Key</label>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded">Active Key</span>
          </div>
          <div className="relative">
            <input
              type={showNvidia ? 'text' : 'password'}
              value={nvidiaKey}
              onChange={(e) => setNvidiaKey(e.target.value)}
              placeholder="nvapi-..."
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 pr-10 text-body-md text-on-surface focus:outline-none focus:border-primary font-mono text-xs"
            />
            <button type="button" onClick={() => setShowNvidia((s) => !s)} className="absolute right-2 top-2.5 text-outline hover:text-primary">
              <span className="material-symbols-outlined text-[18px]">{showNvidia ? 'visibility_off' : 'visibility'}</span>
            </button>
          </div>
          <p className="text-xs text-on-surface-variant mt-1">Powers Llama 3.3 70B, DeepSeek Coder, Mixtral, and Nemotron.</p>
        </div>

        <div>
          <label className="block font-label-md text-label-md font-semibold text-on-surface mb-1">Google Gemini API Key (Optional)</label>
          <div className="relative">
            <input
              type={showGemini ? 'text' : 'password'}
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 pr-10 text-body-md text-on-surface focus:outline-none focus:border-primary"
            />
            <button type="button" onClick={() => setShowGemini((s) => !s)} className="absolute right-2 top-2.5 text-outline hover:text-primary">
              <span className="material-symbols-outlined text-[18px]">{showGemini ? 'visibility_off' : 'visibility'}</span>
            </button>
          </div>
        </div>

        <div>
          <label className="block font-label-md text-label-md font-semibold text-on-surface mb-1">OpenAI API Key (Optional)</label>
          <div className="relative">
            <input
              type={showOpenai ? 'text' : 'password'}
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 pr-10 text-body-md text-on-surface focus:outline-none focus:border-primary"
            />
            <button type="button" onClick={() => setShowOpenai((s) => !s)} className="absolute right-2 top-2.5 text-outline hover:text-primary">
              <span className="material-symbols-outlined text-[18px]">{showOpenai ? 'visibility_off' : 'visibility'}</span>
            </button>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="font-label-md text-label-md font-semibold text-on-surface">Temperature (Creativity)</label>
            <span className="font-mono-streaming text-xs font-semibold text-primary">{temperature}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
            className="w-full accent-primary"
          />
        </div>

        <div>
          <label className="block font-label-md text-label-md font-semibold text-on-surface mb-1">System Instructions</label>
          <textarea
            rows="3"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary resize-none"
          ></textarea>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-outline-variant">
          <div>
            <div className="font-label-md text-label-md font-semibold text-on-surface">Dark Theme</div>
            <div className="text-xs text-on-surface-variant">Switch between light and dark UI themes</div>
          </div>
          <button type="button" onClick={onToggleDarkMode} className="p-2 rounded-lg border border-outline-variant hover:bg-surface-container-high transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">{isDark ? 'light_mode' : 'dark_mode'}</span>
            <span className="text-xs font-medium">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between px-6 py-4 border-t border-outline-variant bg-surface-container-low">
        <button onClick={handleReset} className="text-error hover:bg-error-container/40 px-3 py-1.5 rounded-lg text-body-sm font-label-md transition-colors">
          Reset Defaults
        </button>
        <div className="flex gap-2">
          <button onClick={onClose} className="px-4 py-2 border border-outline-variant hover:bg-surface-container-high rounded-lg text-body-sm font-label-md transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} className="px-4 py-2 bg-primary text-on-primary rounded-lg text-body-sm font-label-md hover:bg-primary/90 transition-colors shadow-sm">
            Save Settings
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
