import React, { useState } from 'react';
import { Helpers } from '../utils/helpers.js';
import { MarkdownRenderer } from '../utils/markdown.js';

export function UserBubble({ msg }) {
  return (
    <div className="flex justify-end w-full message-enter">
      <div className="bg-primary text-on-primary rounded-2xl rounded-tr-sm p-bubble-padding max-w-[80%] font-body-md text-body-md shadow-sm select-text">
        {msg.attachments && msg.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {msg.attachments.map((att, i) => (
              <div key={i} className="inline-flex items-center gap-1 text-xs bg-white/20 px-2 py-1 rounded-md">
                <span className="material-symbols-outlined text-[14px]">attachment</span>
                <span>{att.name}</span>
              </div>
            ))}
          </div>
        )}
        <div className="whitespace-pre-wrap">{msg.content}</div>
        <div className="text-[11px] text-right text-on-primary-container mt-1 opacity-70">
          {Helpers.formatTime(new Date(msg.timestamp))}
        </div>
      </div>
    </div>
  );
}

export function AIBubble({ msg }) {
  const [feedback, setFeedback] = useState(null);
  const formattedHtml = MarkdownRenderer.render(msg.content);

  const handleCopy = async () => {
    const ok = await Helpers.copyToClipboard(msg.content);
    if (ok) Helpers.showToast('Response copied to clipboard');
  };

  const handleFeedback = (type) => {
    setFeedback(type);
    Helpers.showToast(type === 'up' ? 'Thank you for your feedback!' : 'Feedback noted. We will improve!');
  };

  return (
    <div className="flex justify-start w-full group message-enter">
      <div className="flex gap-3 max-w-[80%] w-full">
        <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="material-symbols-outlined text-primary text-sm">smart_toy</span>
        </div>
        <div className="bg-surface-container-low text-on-surface rounded-2xl rounded-tl-sm p-bubble-padding font-body-md text-body-md border border-outline-variant w-full shadow-sm">
          <div
            className="markdown-body font-body-md text-on-surface select-text"
            dangerouslySetInnerHTML={{ __html: formattedHtml }}
          />

          <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-outline-variant/30 text-on-surface-variant text-xs">
            <div className="flex items-center gap-1">
              <button
                className="p-1 hover:text-primary hover:bg-surface-container-high rounded transition-colors"
                title="Copy response"
                onClick={handleCopy}
              >
                <span className="material-symbols-outlined text-[16px]">content_copy</span>
              </button>
              <button
                className={`p-1 hover:bg-surface-container-high rounded transition-colors ${feedback === 'up' ? 'text-primary opacity-100' : 'hover:text-primary'}`}
                title="Good response"
                onClick={() => handleFeedback('up')}
              >
                <span className="material-symbols-outlined text-[16px]">thumb_up</span>
              </button>
              <button
                className={`p-1 hover:bg-surface-container-high rounded transition-colors ${feedback === 'down' ? 'text-error opacity-100' : 'hover:text-error'}`}
                title="Bad response"
                onClick={() => handleFeedback('down')}
              >
                <span className="material-symbols-outlined text-[16px]">thumb_down</span>
              </button>
            </div>
            <span className="text-[11px] text-on-surface-variant/70">{Helpers.formatTime(new Date(msg.timestamp))}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StreamingBubble({ msg, text }) {
  return (
    <div className="flex justify-start w-full group message-enter">
      <div className="flex gap-3 max-w-[80%] w-full">
        <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="material-symbols-outlined text-primary text-sm">smart_toy</span>
        </div>
        <div className="bg-surface-container-low text-on-surface rounded-2xl rounded-tl-sm p-bubble-padding font-body-md text-body-md border border-outline-variant w-full shadow-sm">
          <div className="font-mono-streaming text-mono-streaming text-on-surface-variant streaming-content whitespace-pre-wrap select-text">
            {text}
            <span className="typing-cursor"></span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ErrorBubble({ msg, onRetry }) {
  return (
    <div className="flex justify-start w-full group message-enter">
      <div className="flex gap-3 max-w-[80%]">
        <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="material-symbols-outlined text-primary text-sm">smart_toy</span>
        </div>
        <div className="flex flex-col gap-1">
          <div className="bg-error-container text-on-error-container rounded-2xl rounded-tl-sm p-bubble-padding font-body-md text-body-md border border-error/20 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined">error</span>
              <span className="font-semibold">Failed to generate response.</span>
            </div>
            <div className="text-xs opacity-90">{msg.error || 'Network error occurred'}</div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-body-sm text-body-sm text-error">AI service unavailable - please try again</span>
            <button
              className="retry-action-btn text-primary hover:bg-surface-container-low px-2 py-1 rounded font-label-md text-label-md transition-colors flex items-center gap-1 font-semibold"
              onClick={onRetry}
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span> Retry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
