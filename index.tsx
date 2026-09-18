
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './tailwind.css';

function trackSearchDiscovery() {
  const privatePaths = ['/app', '/olivia', '/b2b'];
  if (privatePaths.some(path => window.location.pathname === path || window.location.pathname.startsWith(path + '/'))) return;

  const referrer = document.referrer;
  if (!referrer) return;
  let host = '';
  try { host = new URL(referrer).hostname.toLowerCase(); } catch { return; }
  const known =
    host.includes('google.') ||
    host === 'bing.com' || host.endsWith('.bing.com') ||
    host === 'chatgpt.com' || host.endsWith('.chatgpt.com') ||
    host === 'copilot.microsoft.com' ||
    host === 'perplexity.ai' || host.endsWith('.perplexity.ai') ||
    host === 'gemini.google.com' ||
    host === 'search.brave.com' ||
    host === 'duckduckgo.com' || host.endsWith('.duckduckgo.com');
  if (!known) return;

  const path = window.location.pathname || '/';
  const storageKey = `donaanna:search-discovery:${path}:${referrer}`;
  try {
    if (sessionStorage.getItem(storageKey)) return;
    sessionStorage.setItem(storageKey, '1');
  } catch {}

  void fetch('https://realtyflow.chatgenius.pro/api/public/search-discovery', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, referrer }),
    keepalive: true,
  }).catch(() => undefined);
}

trackSearchDiscovery();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
