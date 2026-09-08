import React, { useState } from 'react';
import ModalShell from './ModalShell.jsx';
import { Helpers } from '../../utils/helpers.js';

export default function HumanAgentModal({ onClose, onHandoff }) {
  const [topic, setTopic] = useState('');
  const [urgency, setUrgency] = useState('normal');

  const submitSupportTicket = () => {
    Helpers.showToast('Connecting you with a Human Specialist...', 4000);
    onClose();
    setTimeout(() => {
      onHandoff('I would like to transfer this conversation to a human support agent.');
    }, 500);
  };

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-md">
      <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container-low">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">support_agent</span>
          <h3 className="font-headline-md text-lg font-bold text-on-surface">Connect with Human Agent</h3>
        </div>
        <button onClick={onClose} className="p-1 text-on-surface-variant hover:text-on-surface rounded-lg hover:bg-surface-container-high">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <div className="p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3 p-3 bg-surface-container-low rounded-xl border border-outline-variant">
          <div className="w-10 h-10 rounded-full bg-secondary text-on-secondary flex items-center justify-center font-bold">
            SJ
          </div>
          <div>
            <div className="font-label-md font-semibold text-on-surface">Support Specialist On Duty</div>
            <div className="text-xs text-on-surface-variant flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 status-pulse"></span>
              <span>Average response time: 2 mins</span>
            </div>
          </div>
        </div>

        <div>
          <label className="block font-label-md text-label-md font-semibold text-on-surface mb-1">Issue Topic</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., Financial report interpretation error"
            className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="block font-label-md text-label-md font-semibold text-on-surface mb-1">Urgency</label>
          <select
            value={urgency}
            onChange={(e) => setUrgency(e.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-primary"
          >
            <option value="normal">Normal - General Inquiry</option>
            <option value="high">High - Escalated Issue</option>
            <option value="critical">Critical - Business Blocker</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-outline-variant bg-surface-container-low">
        <button onClick={onClose} className="px-4 py-2 border border-outline-variant hover:bg-surface-container-high rounded-lg text-body-sm font-label-md transition-colors">
          Cancel
        </button>
        <button onClick={submitSupportTicket} className="px-4 py-2 bg-primary text-on-primary rounded-lg text-body-sm font-label-md hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm">send</span> Start Live Hand-off
        </button>
      </div>
    </ModalShell>
  );
}
