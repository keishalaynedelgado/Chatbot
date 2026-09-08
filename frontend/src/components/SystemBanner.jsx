import React, { useEffect, useState } from 'react';

export default function SystemBanner() {
  const [hidden, setHidden] = useState(true);
  const [text, setText] = useState('Network connection unstable. Some messages may fail to send.');

  useEffect(() => {
    const updateStatus = () => {
      if (!navigator.onLine) {
        setText('Network connection offline. Local fallback mode enabled.');
        setHidden(false);
      } else {
        setHidden(true);
      }
    };

    window.addEventListener('offline', updateStatus);
    window.addEventListener('online', updateStatus);
    return () => {
      window.removeEventListener('offline', updateStatus);
      window.removeEventListener('online', updateStatus);
    };
  }, []);

  if (hidden) return null;

  return (
    <div className="w-full bg-error-container text-on-error-container py-2 px-4 text-center font-body-sm text-body-sm flex justify-center items-center gap-2 shadow-xs transition-all">
      <span className="material-symbols-outlined text-sm">warning</span>
      <span>{text}</span>
      <button onClick={() => setHidden(true)} className="ml-2 hover:opacity-75">
        <span className="material-symbols-outlined text-sm">close</span>
      </button>
    </div>
  );
}
