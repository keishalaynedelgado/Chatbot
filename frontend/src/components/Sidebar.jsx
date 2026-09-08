import React from 'react';

export default function Sidebar({ mobileOpen, onCloseMobile, onNewChat, onOpenHistory, onOpenFAQs, onOpenHumanAgent, onOpenSettings }) {
  return (
    <>
      <div
        id="sidebar-backdrop"
        className={`fixed inset-0 bg-inverse-surface/40 backdrop-blur-xs z-40 md:hidden ${mobileOpen ? '' : 'hidden'}`}
        onClick={onCloseMobile}
      ></div>

      <nav
        id="sidebar-nav"
        className={`fixed md:fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 py-6 px-4 flex flex-col gap-4 bg-surface-container-low dark:bg-inverse-surface border-r border-outline-variant dark:border-outline z-40 drawer-transition ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        <div className="mb-4">
          <div className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed-dim">Synthie AI</div>
          <div className="font-body-sm text-body-sm text-on-surface-variant dark:text-on-surface-variant flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 status-pulse"></span>
            <span>Online (Vercel AI SDK)</span>
          </div>
        </div>

        <button
          id="new-chat-btn"
          onClick={onNewChat}
          className="bg-primary text-on-primary rounded-lg py-2.5 px-4 font-label-md text-label-md hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-98"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>New Chat</span>
        </button>

        <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto">
          <a className="flex items-center gap-3 px-3 py-2 text-on-surface-variant dark:text-on-surface-variant hover:bg-surface-container-high dark:hover:bg-surface-variant transition-all duration-200 rounded-lg active:scale-95 cursor-pointer" onClick={onOpenHistory}>
            <span className="material-symbols-outlined text-[20px]">history</span>
            <span className="font-label-md text-label-md">History</span>
          </a>
          <a className="flex items-center gap-3 px-3 py-2 text-on-surface-variant dark:text-on-surface-variant hover:bg-surface-container-high dark:hover:bg-surface-variant transition-all duration-200 rounded-lg active:scale-95 cursor-pointer" onClick={onOpenFAQs}>
            <span className="material-symbols-outlined text-[20px]">quiz</span>
            <span className="font-label-md text-label-md">FAQs</span>
          </a>
          <a className="flex items-center gap-3 px-3 py-2 text-on-surface-variant dark:text-on-surface-variant hover:bg-surface-container-high dark:hover:bg-surface-variant transition-all duration-200 rounded-lg active:scale-95 cursor-pointer" onClick={onOpenHumanAgent}>
            <span className="material-symbols-outlined text-[20px]">support_agent</span>
            <span className="font-label-md text-label-md">Human Agent</span>
          </a>
          <a className="flex items-center gap-3 px-3 py-2 bg-secondary-container dark:bg-secondary text-on-secondary-container dark:text-on-secondary rounded-lg font-bold hover:opacity-95 transition-all duration-200 active:scale-95 cursor-pointer" onClick={onOpenSettings}>
            <span className="material-symbols-outlined text-[20px]">settings</span>
            <span className="font-label-md text-label-md">Settings</span>
          </a>
        </div>

        <div className="mt-auto flex flex-col gap-1 pt-3 border-t border-outline-variant/60">
          <a className="flex items-center gap-3 px-3 py-1.5 text-on-surface-variant dark:text-on-surface-variant hover:bg-surface-container-high dark:hover:bg-surface-variant transition-all duration-200 rounded-lg text-xs active:scale-95 cursor-pointer" onClick={onOpenFAQs}>
            <span className="material-symbols-outlined text-[18px]">gavel</span>
            <span className="font-label-md">Privacy</span>
          </a>
          <a className="flex items-center gap-3 px-3 py-1.5 text-on-surface-variant dark:text-on-surface-variant hover:bg-surface-container-high dark:hover:bg-surface-variant transition-all duration-200 rounded-lg text-xs active:scale-95 cursor-pointer" onClick={onOpenFAQs}>
            <span className="material-symbols-outlined text-[18px]">description</span>
            <span className="font-label-md">Terms</span>
          </a>
        </div>
      </nav>
    </>
  );
}
