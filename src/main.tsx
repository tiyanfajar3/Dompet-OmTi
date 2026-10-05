import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register PWA Service Worker
if ('serviceWorker' in navigator && typeof window !== 'undefined' && import.meta.env.MODE !== 'test') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('SW registration skipped or failed:', err);
    });
  });
}

createRoot(document.getElementById('root')!).render(<App />);
