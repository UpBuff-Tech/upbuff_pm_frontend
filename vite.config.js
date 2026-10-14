import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The Spring Boot backend. Every request the app makes to these paths is forwarded to it,
// so the browser only ever talks to one address (no CORS setup needed in development).
const BACKEND = process.env.BACKEND_URL || 'http://localhost:8080';

// Requests through this proxy are same-origin for the browser, so the browser's Origin header is
// removed (otherwise the backend's CORS check would treat them as cross-site calls).
const toBackend = {
  target: BACKEND,
  configure: (proxy) => proxy.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin')),
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/rpc': toBackend,
      '/pub': toBackend,
      '/auth': toBackend,
      '/pagination': toBackend,
      '/api': toBackend,
    },
  },
});
