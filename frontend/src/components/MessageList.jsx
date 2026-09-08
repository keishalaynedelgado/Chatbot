import React, { useEffect, useRef } from 'react';
import EmptyState from './EmptyState.jsx';
import { UserBubble, AIBubble, StreamingBubble, ErrorBubble } from './MessageBubbles.jsx';

export default function MessageList({ conversation, streamingId, streamingText, onSelectPrompt, onRetry }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    if (isNearBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [conversation?.messages, streamingText]);

  if (!conversation || conversation.messages.length === 0) {
    return (
      <div id="chat-scroll-area" ref={containerRef} className="flex-1 overflow-y-auto px-edge-margin-mobile md:px-edge-margin-desktop py-section-margin flex flex-col items-center">
        <div className="w-full max-w-container-max flex flex-col gap-stack-gap">
          <EmptyState onSelectPrompt={onSelectPrompt} />
        </div>
      </div>
    );
  }

  return (
    <div id="chat-scroll-area" ref={containerRef} className="flex-1 overflow-y-auto px-edge-margin-mobile md:px-edge-margin-desktop py-section-margin flex flex-col items-center">
      <div className="w-full max-w-container-max flex flex-col gap-stack-gap">
        {conversation.messages.map((msg) => {
          if (msg.role === 'user') {
            return <UserBubble key={msg.id} msg={msg} />;
          }
          if (msg.status === 'error') {
            return <ErrorBubble key={msg.id} msg={msg} onRetry={onRetry} />;
          }
          if (msg.id === streamingId && msg.status === 'streaming') {
            return <StreamingBubble key={msg.id} msg={msg} text={streamingText} />;
          }
          if (msg.status === 'streaming') {
            return <StreamingBubble key={msg.id} msg={msg} text={msg.content} />;
          }
          return <AIBubble key={msg.id} msg={msg} />;
        })}
      </div>
    </div>
  );
}
