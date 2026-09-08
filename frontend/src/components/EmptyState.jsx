import React from 'react';
import { CONFIG } from '../config.js';

export default function EmptyState({ onSelectPrompt }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center max-w-2xl mx-auto message-enter">
      <div className="w-16 h-16 rounded-2xl bg-surface-container-high dark:bg-surface-variant flex items-center justify-center mb-4 text-primary shadow-sm">
        <span className="material-symbols-outlined text-3xl">smart_toy</span>
      </div>
      <h2 className="font-headline-md text-headline-md font-bold text-on-surface">Welcome to Synthie AI</h2>
      <p className="font-body-md text-body-md text-on-surface-variant max-w-md mt-2 mb-8">
        Your modern enterprise AI assistant for financial intelligence, meeting synthesis, and automated workflows.
      </p>

      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3">
        {CONFIG.STARTER_PROMPTS.map((item, i) => (
          <button
            key={i}
            className="starter-prompt-card text-left p-4 rounded-xl border border-outline-variant hover:border-primary bg-surface-container-lowest hover:bg-surface-container-low transition-all duration-200 shadow-sm flex flex-col gap-2 group cursor-pointer"
            onClick={() => onSelectPrompt(item.prompt)}
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 rounded-lg bg-surface-container-high group-hover:bg-primary/10 flex items-center justify-center text-primary transition-colors">
                <span className="material-symbols-outlined text-sm">{item.icon}</span>
              </div>
              <span className="material-symbols-outlined text-outline-variant group-hover:text-primary transition-colors text-sm">arrow_forward</span>
            </div>
            <div>
              <div className="font-label-md text-label-md font-semibold text-on-surface">{item.title}</div>
              <div className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{item.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
