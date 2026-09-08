import React, { useRef } from 'react';
import { Helpers } from '../utils/helpers.js';

export default function InputBar({ value, onChange, onSend, onStop, isGenerating, attachments, setAttachments }) {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleInput = (e) => {
    onChange(e.target.value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 160) + 'px';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const text = value.trim();
      if (text || attachments.length > 0) {
        onSend(text);
      }
    }
  };

  const handleSendClick = () => {
    if (isGenerating) {
      onStop();
      return;
    }
    const text = value.trim();
    if (text || attachments.length > 0) {
      onSend(text);
    }
  };

  const uploadToKnowledgeBase = (file) => {
    const entry = { name: file.name, size: file.size, type: file.type, status: 'uploading' };
    setAttachments((prev) => [...prev, entry]);

    const formData = new FormData();
    formData.append('file', file);

    fetch('/api/documents/upload', { method: 'POST', body: formData })
      .then((res) => res.json())
      .then((result) => {
        setAttachments((prev) => prev.filter((f) => f !== entry));
        if (result.status === 'ready') {
          Helpers.showToast(`${file.name} added to knowledge base (${result.chunkCount} chunks indexed)`);
        } else {
          Helpers.showToast(`Couldn't add ${file.name} to the knowledge base: ${result.reason || 'unknown error'}`);
        }
      })
      .catch(() => {
        setAttachments((prev) => prev.filter((f) => f !== entry));
        Helpers.showToast(`Failed to upload ${file.name}`);
      });
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((f) => uploadToKnowledgeBase(f));
    e.target.value = '';
  };

  const removeAttachment = (idx) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="w-full px-edge-margin-mobile md:px-edge-margin-desktop py-4 bg-background/80 dark:bg-background/80 backdrop-blur-md border-t border-outline-variant dark:border-outline flex flex-col items-center z-20">
      <div className="w-full max-w-container-max flex flex-col gap-2">

        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-1">
            {attachments.map((file, idx) => (
              <div key={idx} className="inline-flex items-center gap-1.5 bg-surface-container-high dark:bg-surface-variant text-on-surface px-2.5 py-1 rounded-lg text-xs border border-outline-variant">
                <span className="material-symbols-outlined text-sm text-primary">description</span>
                <span className="max-w-[150px] truncate">{file.name}</span>
                <button type="button" onClick={() => removeAttachment(idx)} className="text-on-surface-variant hover:text-error ml-1">
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="w-full relative shadow-[0px_4px_20px_rgba(0,0,0,0.05)] rounded-xl bg-surface-container-lowest dark:bg-inverse-surface border border-outline-variant dark:border-outline p-2 flex items-end gap-2 transition-all focus-within:border-primary">
          <input type="file" ref={fileInputRef} multiple className="hidden" onChange={handleFileChange} />

          <button
            type="button"
            className="p-2 text-outline hover:text-primary transition-colors rounded-full hover:bg-surface-container-low dark:hover:bg-surface-variant flex-shrink-0"
            title="Attach file"
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="material-symbols-outlined text-[20px]">attach_file</span>
          </button>

          <textarea
            ref={textareaRef}
            className="w-full bg-transparent border-none focus:ring-0 resize-none font-body-md text-body-md py-2 placeholder:text-outline-variant text-on-surface dark:text-inverse-on-surface max-h-32 focus:outline-none"
            placeholder="Message Synthie AI..."
            rows="1"
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
          ></textarea>

          <button
            className={`p-2 rounded-lg transition-all flex-shrink-0 shadow-sm active:scale-95 ${isGenerating ? 'bg-error text-on-primary' : 'bg-primary text-on-primary hover:bg-primary/90'}`}
            title={isGenerating ? 'Stop generating' : 'Send message'}
            onClick={handleSendClick}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              {isGenerating ? 'stop' : 'send'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
