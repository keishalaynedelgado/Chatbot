import React from 'react';

export default function ModalShell({ onClose, maxWidth = 'max-w-lg', children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`modal-content bg-surface-container-lowest text-on-surface w-full ${maxWidth} rounded-2xl shadow-2xl border border-outline-variant overflow-hidden flex flex-col max-h-[90vh]`}>
        {children}
      </div>
    </div>
  );
}
