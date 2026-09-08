import React from 'react';

export default function Header({ onToggleMobileMenu, onNewChat, onOpenSettings }) {
  return (
    <header className="bg-background dark:bg-background top-0 flex justify-between items-center h-16 px-edge-margin-mobile md:px-edge-margin-desktop w-full border-b border-outline-variant dark:border-outline z-50 fixed backdrop-blur-md bg-opacity-95 dark:bg-opacity-95">
      <div className="flex items-center gap-3">
        <button
          id="mobile-menu-toggle"
          className="md:hidden p-2 text-on-surface-variant hover:text-primary rounded-lg hover:bg-surface-container-low transition-colors"
          title="Toggle Menu"
          onClick={onToggleMobileMenu}
        >
          <span className="material-symbols-outlined text-2xl">menu</span>
        </button>
        <div
          className="font-headline-md text-headline-md font-semibold text-primary dark:text-primary-fixed-dim tracking-tight flex items-center gap-2 cursor-pointer"
          onClick={onNewChat}
        >
          <span>Synthie</span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container-high dark:bg-surface-variant text-[11px] font-medium text-primary dark:text-primary-fixed-dim border border-outline-variant/60">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Vercel AI SDK Active</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={onOpenSettings} className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-low dark:hover:bg-surface-container-highest transition-colors rounded-full" title="Settings">
          <span className="material-symbols-outlined text-[22px]">settings</span>
        </button>
        <button onClick={onOpenSettings} className="flex items-center text-primary dark:text-primary-fixed-dim hover:bg-surface-container-low dark:hover:bg-surface-container-highest transition-all rounded-full p-1 cursor-pointer active:scale-95" title="User Profile">
          <span className="material-symbols-outlined text-3xl">account_circle</span>
        </button>
      </div>
    </header>
  );
}
