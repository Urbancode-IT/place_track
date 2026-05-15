import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { listenToForegroundMessages } from '@/lib/pushNotifications';
import { QUERY_GC_MS, QUERY_STALE_MS } from '@/lib/queryDefaults';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: QUERY_STALE_MS,
      gcTime: QUERY_GC_MS,
    },
    mutations: { retry: 0 },
  },
});

listenToForegroundMessages((payload) => {
  // Minimal foreground handling: show a native notification when app is open.
  if (Notification.permission === 'granted' && payload?.notification) {
    const { title, body } = payload.notification;
    new Notification(title || 'Notification', { body: body || '' });
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
