import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Prevent benign development WebSocket connection rejections from triggering full-screen crash overlays
if (process.env.NODE_ENV !== 'production') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const reasonStr = String(reason);
    if (
      reasonStr.includes('WebSocket') ||
      reasonStr.includes('vite') ||
      (reason instanceof Error && reason.message.includes('WebSocket')) ||
      (reason instanceof Error && reason.message.includes('vite')) ||
      reasonStr.includes('closed without opened') ||
      (reason instanceof Error && reason.message.includes('closed without opened'))
    ) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    if (
      msg.includes('WebSocket') || 
      msg.includes('vite') || 
      msg.includes('connection')
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  const originalConsoleError = console.error;
  console.error = (...args) => {
    const msg = args.map(String).join(' ');
    if (
      msg.includes('WebSocket') ||
      msg.includes('[vite]')
    ) {
      return; // swallow benign Vite errors
    }
    originalConsoleError(...args);
  };

  const originalConsoleLog = console.log;
  console.log = (...args) => {
    const msg = args.map(String).join(' ');
    if (msg.includes('[vite] connecting...') || msg.includes('[vite] connected')) {
      return;
    }
    originalConsoleLog(...args);
  };

  const style = document.createElement('style');
  style.innerHTML = 'vite-error-overlay { display: none !important; }';
  document.head.appendChild(style);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

