import React, { useEffect, useState } from 'react';
import Header from './components/Header.jsx';
import Sidebar from './components/Sidebar.jsx';
import SystemBanner from './components/SystemBanner.jsx';
import MessageList from './components/MessageList.jsx';
import InputBar from './components/InputBar.jsx';
import Footer from './components/Footer.jsx';
import ModalHost from './components/modals/ModalHost.jsx';
import { useChatManager } from './hooks/useChatManager.js';
import { aiService } from './services/aiService.js';
import { StorageService } from './services/storage.js';
import { Helpers } from './utils/helpers.js';

export default function App() {
  const chat = useChatManager();

  const [inputValue, setInputValue] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [isDark, setIsDark] = useState(false);

  // Initialize theme from stored settings on first mount
  useEffect(() => {
    const settings = StorageService.getSettings();
    setIsDark(!!settings.darkMode);
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    console.log('✨ Synthie AI initialized successfully.');
  }, []);

  const resetSendButton = () => setIsGenerating(false);

  const runStream = (messages, { onErrorMessage } = {}) => {
    return aiService.streamChat({
      messages,
      onStart: () => setIsGenerating(true),
      onChunk: (chunk) => chat.appendChunk(chunk),
      onComplete: () => {
        chat.finalizeAssistantMessage();
        resetSendButton();
      },
      onError: (err) => {
        chat.setAssistantError(err.message || onErrorMessage || 'An unexpected error occurred.');
        resetSendButton();
      }
    });
  };

  const sendMessage = async (customText) => {
    if (aiService.isGenerating) return;

    const content = (customText !== undefined ? customText : inputValue)?.trim();
    const currentAttachments = [...attachments];

    if (!content && currentAttachments.length === 0) return;

    setInputValue('');
    setAttachments([]);

    chat.addUserMessage(content, currentAttachments);
    chat.addAssistantPlaceholder();

    // Build the message history exactly like the original: exclude the
    // just-added empty placeholder and any blank messages.
    const currentMessages = (chat.activeConversation?.messages || [])
      .filter((m) => m.content && m.content.trim().length > 0)
      .map((m) => ({ role: m.role, content: m.content.trim() }));
    currentMessages.push({ role: 'user', content });

    await runStream(currentMessages);
  };

  const abort = () => {
    aiService.abort();
    resetSendButton();
    Helpers.showToast('Generation cancelled');
  };

  const retryLastMessage = async () => {
    if (aiService.isGenerating) return;
    const messages = chat.prepareRetry();
    if (!messages || messages.length === 0) return;

    chat.addAssistantPlaceholder();
    await runStream(messages, { onErrorMessage: 'Retry failed.' });
  };

  const newChat = () => {
    if (aiService.isGenerating) {
      abort();
    }
    chat.createNewChat();
    setInputValue('');
    setAttachments([]);
    Helpers.showToast('Started new conversation');
  };

  const toggleDarkMode = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    StorageService.saveSettings({ darkMode: next });
  };

  const openModal = (name) => setActiveModal(name);
  const closeModal = () => setActiveModal(null);

  return (
    <>
      <Header
        onToggleMobileMenu={() => setMobileMenuOpen((v) => !v)}
        onNewChat={newChat}
        onOpenSettings={() => openModal('settings')}
      />

      <div className="flex flex-1 pt-16 overflow-hidden">
        <Sidebar
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
          onNewChat={newChat}
          onOpenHistory={() => openModal('history')}
          onOpenFAQs={() => openModal('faqs')}
          onOpenHumanAgent={() => openModal('human_agent')}
          onOpenSettings={() => openModal('settings')}
        />

        <main className="flex-1 ml-0 md:ml-64 flex flex-col h-[calc(100vh-4rem)] relative w-full">
          <SystemBanner />

          <MessageList
            conversation={chat.activeConversation}
            streamingId={chat.streamingId}
            streamingText={chat.streamingText}
            onSelectPrompt={(prompt) => sendMessage(prompt)}
            onRetry={retryLastMessage}
          />

          <InputBar
            value={inputValue}
            onChange={setInputValue}
            onSend={sendMessage}
            onStop={abort}
            isGenerating={isGenerating}
            attachments={attachments}
            setAttachments={setAttachments}
          />
        </main>
      </div>

      <Footer onOpenFAQs={() => openModal('faqs')} />

      <ModalHost
        activeModal={activeModal}
        onClose={closeModal}
        isDark={isDark}
        onToggleDarkMode={toggleDarkMode}
        chat={chat}
        onHandoff={(text) => sendMessage(text)}
      />
    </>
  );
}
