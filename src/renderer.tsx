import React from 'react';
import { createRoot } from 'react-dom/client';
import log from 'electron-log/renderer';
import { App } from './renderer/App';

// Capture soft renderer JS errors (window.onerror / unhandledrejection) to file
// via the renderer→main bridge (D§1.2.1). Hard crashes are caught in main.
log.errorHandler.startCatching();
log.scope('renderer').info('renderer started');

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
