import React, { useEffect } from 'react';
import SettingsModal from './SettingsModal.jsx';
import HistoryModal from './HistoryModal.jsx';
import FAQModal from './FAQModal.jsx';
import HumanAgentModal from './HumanAgentModal.jsx';

export default function ModalHost({ activeModal, onClose, isDark, onToggleDarkMode, chat, onHandoff }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && activeModal) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeModal, onClose]);

  if (!activeModal) return null;

  if (activeModal === 'settings') {
    return <SettingsModal onClose={onClose} isDark={isDark} onToggleDarkMode={onToggleDarkMode} />;
  }
  if (activeModal === 'history') {
    return (
      <HistoryModal
        onClose={onClose}
        conversations={chat.conversations}
        activeId={chat.activeId}
        onSwitch={chat.switchConversation}
        onDelete={chat.deleteConversation}
        onClearAll={chat.clearAllChats}
        exportChatMarkdown={chat.exportChatMarkdown}
      />
    );
  }
  if (activeModal === 'faqs') {
    return <FAQModal onClose={onClose} />;
  }
  if (activeModal === 'human_agent') {
    return <HumanAgentModal onClose={onClose} onHandoff={onHandoff} />;
  }
  return null;
}
