import './src/loadEnv.js';
import http from 'http';
import { app } from './src/app.js';
import { initSocket } from './src/config/socket.js';
import { initCronJobs } from './src/jobs/index.js';

const PORT = process.env.PORT || 5001;
const server = http.createServer(app);

initSocket(server);
initCronJobs();

server.listen(PORT, () => {
  console.log(`PlaceTrack API running on port ${PORT}`);
});

export default server;
