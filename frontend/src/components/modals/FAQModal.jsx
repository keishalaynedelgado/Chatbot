import React from 'react';
import ModalShell from './ModalShell.jsx';
import { CONFIG } from '../../config.js';

export default function FAQModal({ onClose }) {
  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container-low">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">quiz</span>
          <h3 className="font-headline-md text-lg font-bold text-on-surface">Frequently Asked Questions</h3>
        </div>
        <button onClick={onClose} className="p-1 text-on-surface-variant hover:text-on-surface rounded-lg hover:bg-surface-container-high">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <div className="p-6 overflow-y-auto flex flex-col gap-3">
        {CONFIG.FAQS.map((faq, i) => (
          <details key={i} className="group rounded-xl border border-outline-variant p-4 bg-surface-container-low open:bg-surface-container transition-all">
            <summary className="font-label-md font-semibold text-on-surface cursor-pointer flex items-center justify-between list-none select-none">
              <span>{faq.question}</span>
              <span className="material-symbols-outlined group-open:rotate-180 transition-transform text-sm text-outline">expand_more</span>
            </summary>
            <p className="font-body-sm text-on-surface-variant mt-3 pt-3 border-t border-outline-variant/50 leading-relaxed">
              {faq.answer}
            </p>
          </details>
        ))}
      </div>

      <div className="px-6 py-4 border-t border-outline-variant bg-surface-container-low text-right">
        <button onClick={onClose} className="px-4 py-2 bg-primary text-on-primary rounded-lg text-body-sm font-label-md hover:bg-primary/90">
          Close
        </button>
      </div>
    </ModalShell>
  );
}
