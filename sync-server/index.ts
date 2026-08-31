import { WebSocketServer } from 'ws';
import { SyncServer } from './server';

const PORT = parseInt(process.env.PORT || '4444', 10);

const wss = new WebSocketServer({ port: PORT });
const syncServer = new SyncServer();
syncServer.attachWebSocketServer(wss);

console.log(`[Braid SyncServer] WebSocket server running on ws://localhost:${PORT}`);

process.on('SIGINT', () => {
  console.log('[Braid SyncServer] Shutting down...');
  wss.close(() => {
    process.exit(0);
  });
});
