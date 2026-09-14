import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './context/AuthContext.tsx';
import { DialogProvider } from './context/DialogContext.tsx';
import { API_BASE_URL } from './services/apiClient.ts';

// Transparently route /api requests to external backend if VITE_API_URL is configured
if (API_BASE_URL && typeof window !== 'undefined') {
  const nativeFetch = window.fetch;
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    if (typeof input === 'string' && input.startsWith('/api')) {
      input = `${API_BASE_URL}${input}`;
    }
    return nativeFetch.call(this, input, init);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <DialogProvider>
        <App />
      </DialogProvider>
    </AuthProvider>
  </StrictMode>,
);

