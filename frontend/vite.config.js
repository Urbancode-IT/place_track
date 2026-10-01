import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const apiTarget = 'http://127.0.0.1:5001';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts') || id.includes('d3-')) return 'charts';
            if (id.includes('@dnd-kit')) return 'dnd';
            if (id.includes('firebase')) return 'firebase';
            if (id.includes('@tanstack')) return 'query';
            if (
              id.includes('react-dom') ||
              id.includes('react-router') ||
              id.includes('/react/')
            ) {
              return 'react-vendor';
            }
          }
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}'],
  },
  server: {
    port: 5173,
    watch: {
      ignored: ['**/*.test.js', '**/*.test.jsx', '**/e2e/**'],
    },
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        timeout: 60_000,
        proxyTimeout: 60_000,
      },
      '/health': { target: apiTarget, changeOrigin: true },
      '/socket.io': { target: apiTarget, changeOrigin: true, ws: true },
    },
  },
});
