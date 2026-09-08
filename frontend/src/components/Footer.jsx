import React from 'react';

export default function Footer({ onOpenFAQs }) {
  return (
    <footer className="bg-background dark:bg-background full-width bottom-0 border-t border-outline-variant dark:border-outline flex flex-col md:flex-row justify-between items-center py-3 px-edge-margin-mobile md:px-edge-margin-desktop w-full max-w-container-max mx-auto z-30 relative ml-0 md:ml-64 md:w-[calc(100%-16rem)]">
      <div className="font-body-sm text-body-sm text-on-surface-variant dark:text-on-surface-variant mb-2 md:mb-0 text-xs">
        © 2026 Synthie AI. All rights reserved.
      </div>
      <div className="flex gap-4">
        <a className="font-body-sm text-body-sm text-on-surface-variant dark:text-on-surface-variant hover:text-primary dark:hover:text-primary-fixed-dim opacity-80 hover:opacity-100 transition-opacity text-xs cursor-pointer" onClick={onOpenFAQs}>Privacy Policy</a>
        <a className="font-body-sm text-body-sm text-on-surface-variant dark:text-on-surface-variant hover:text-primary dark:hover:text-primary-fixed-dim opacity-80 hover:opacity-100 transition-opacity text-xs cursor-pointer" onClick={onOpenFAQs}>Terms of Service</a>
        <a className="font-body-sm text-body-sm text-on-surface-variant dark:text-on-surface-variant hover:text-primary dark:hover:text-primary-fixed-dim opacity-80 hover:opacity-100 transition-opacity text-xs cursor-pointer" onClick={onOpenFAQs}>Help Center</a>
      </div>
    </footer>
  );
}
