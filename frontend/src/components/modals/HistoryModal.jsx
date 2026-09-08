import React from 'react';
import ModalShell from './ModalShell.jsx';
import { Helpers } from '../../utils/helpers.js';

export default function HistoryModal({ onClose, conversations, activeId, onSwitch, onDelete, onClearAll, exportChatMarkdown }) {
  const handleClearAll = () => {
    if (confirm('Clear all conversation history?')) {
      onClearAll();
      onClose();
      Helpers.showToast('All chats cleared');
    }
  };

  const handleExport = async () => {
    const ok = await Helpers.copyToClipboard(exportChatMarkdown());
    if (ok) Helpers.showToast('Chat history copied as Markdown!');
  };

  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container-low">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">history</span>
          <h3 className="font-headline-md text-lg font-bold text-on-surface">Conversation History</h3>
        </div>
        <button onClick={onClose} className="p-1 text-on-surface-variant hover:text-on-surface rounded-lg hover:bg-surface-container-high">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <div className="p-6 overflow-y-auto flex flex-col gap-2 flex-1">
        {conversations.length === 0 ? (
          <div className="p-8 text-center text-on-surface-variant text-sm">No saved conversation history yet.</div>
        ) : (
          conversations.map((c) => (
            <div
              key={c.id}
              className={`flex items-center justify-between p-3 rounded-xl border ${c.id === activeId ? 'border-primary bg-primary/5 font-semibold' : 'border-outline-variant hover:bg-surface-container-high'} transition-all group`}
            >
              <button
                className="flex-1 text-left flex items-center gap-3 overflow-hidden"
                onClick={() => { onSwitch(c.id); onClose(); }}
              >
                <span className="material-symbols-outlined text-primary text-sm">chat</span>
                <div className="overflow-hidden">
                  <div className="truncate text-on-surface text-body-md">{c.title || 'Untitled Chat'}</div>
                  <div className="text-xs text-on-surface-variant">{Helpers.formatRelativeDate(c.updatedAt)} • {c.messages.length} messages</div>
                </div>
              </button>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onDelete(c.id)} className="p-1 hover:text-error rounded transition-colors" title="Delete conversation">
                  <span className="material-symbols-outlined text-sm">delete</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center justify-between px-6 py-4 border-t border-outline-variant bg-surface-container-low">
        <button onClick={handleClearAll} className="text-error hover:bg-error-container/40 px-3 py-1.5 rounded-lg text-body-sm font-label-md transition-colors flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">delete_sweep</span> Clear All
        </button>
        <button onClick={handleExport} className="px-4 py-2 bg-secondary text-on-secondary rounded-lg text-body-sm font-label-md hover:bg-secondary/90 transition-colors flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm">file_download</span> Export Markdown
        </button>
      </div>
    </ModalShell>
  );
}
