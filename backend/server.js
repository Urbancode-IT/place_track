import './src/loadEnv.js';
import dns from 'node:dns';
import http from 'http';
import { app } from './src/app.js';
import { initSocket } from './src/config/socket.js';
import { initCronJobs } from './src/jobs/index.js';

dns.setDefaultResultOrder('ipv4first');

const PORT = process.env.PORT || 5001;
const HOST = process.env.HOST || '0.0.0.0';
const server = http.createServer(app);

// Chrome keeps idle sockets ~60s. Node's default keepAliveTimeout is 5s, so the
// next request (often login) hits a closed socket → axios ERR_NETWORK, then a
// fresh connection succeeds a moment later.
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

initSocket(server);
initCronJobs();

const MAX_LISTEN_ATTEMPTS = 25;

function startListening(attempt = 0) {
  const onListenError = (err) => {
    // node --watch starts the new process before the old one has released the port.
    if (err.code === 'EADDRINUSE' && attempt < MAX_LISTEN_ATTEMPTS) {
      setTimeout(() => startListening(attempt + 1), 200);
      return;
    }
    console.error('[api] failed to listen:', err);
    process.exit(1);
  };

  server.once('error', onListenError);
  server.listen(PORT, HOST, () => {
    server.removeListener('error', onListenError);
    console.log(`PlaceTrack API running on port ${PORT}`);
  });
}

startListening();

export default server;
