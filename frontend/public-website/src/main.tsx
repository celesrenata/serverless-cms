import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
// Layer declaration must be the first stylesheet import to establish cascade order
import './styles/layers.css';
import './index.css';
import './styles/wp-content.css';
// Prism.js syntax highlighting theme
import 'prismjs/themes/prism-tomorrow.css';
// Code block layout and overflow styles
import './styles/markdown-code.css';
// Import theme CSS files
import './themes/dark.css';
import './themes/light.css';
import './themes/minimal.css';
import './themes/custom.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <HelmetProvider>
          <App />
        </HelmetProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
