import http from 'node:http';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const apiHost = '127.0.0.1';
const apiPort = 5001;
const apiTarget = `http://${apiHost}:${apiPort}`;
const proxyRetryable = new Set(['ECONNREFUSED', 'ECONNRESET', 'EPIPE']);
const apiAgent = new http.Agent({ keepAlive: false });
let lastProxyWarnAt = 0;

function isProxiedHttpPath(url = '') {
  return url.startsWith('/api') || url === '/health' || url.startsWith('/health?');
}

function warnProxyDown(server, method, url, code) {
  const now = Date.now();
  if (now - lastProxyWarnAt < 4000) return;
  lastProxyWarnAt = now;
  server.config.logger.warn(
    `[api] ${method || 'GET'} ${url} failed (${code}). Nothing is accepting connections on ${apiHost}:${apiPort} — start the backend with npm run dev.`
  );
}

function forwardToApi(req, res, body, attempt, server) {
  const headers = { ...req.headers, host: `${apiHost}:${apiPort}` };
  if (body.length) headers['content-length'] = String(body.length);
  let settled = false;

  const proxyReq = http.request(
    {
      hostname: apiHost,
      port: apiPort,
      path: req.url,
      method: req.method,
      headers,
      agent: apiAgent,
      timeout: 60_000,
    },
    (proxyRes) => {
      settled = true;
      const responseHeaders = { ...proxyRes.headers };
      delete responseHeaders.connection;
      delete responseHeaders['keep-alive'];
      delete responseHeaders['transfer-encoding'];
      if (!res.headersSent) res.writeHead(proxyRes.statusCode || 502, responseHeaders);
      proxyRes.pipe(res);
    }
  );

  const fail = (err) => {
    if (settled) return;
    settled = true;
    proxyReq.destroy();
    if (
      !res.headersSent &&
      !res.writableEnded &&
      attempt < 8 &&
      proxyRetryable.has(err?.code)
    ) {
      setTimeout(() => forwardToApi(req, res, body, attempt + 1, server), 200 * (attempt + 1));
      return;
    }
    if (!res.headersSent) {
      warnProxyDown(server, req.method, req.url, err?.code || 'error');
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          message: 'API is not running on port 5001. Start the backend and try again.',
        })
      );
    }
  };

  proxyReq.on('error', fail);
  proxyReq.on('timeout', () => {
    fail(Object.assign(new Error('API request timed out'), { code: 'ETIMEDOUT' }));
  });
  proxyReq.end(body);
}

/** Dev proxy that waits out a backend restart instead of logging a stack per dashboard call. */
function devApiProxy() {
  return {
    name: 'dev-api-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!isProxiedHttpPath(req.url)) return next();
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => forwardToApi(req, res, Buffer.concat(chunks), 0, server));
        req.on('error', () => {
          if (!res.headersSent) res.end();
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [devApiProxy(), react()],
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
      '/socket.io': { target: apiTarget, changeOrigin: true, ws: true },
    },
  },
});
