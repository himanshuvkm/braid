import http from 'node:http';
import { WebSocketServer } from 'ws';
import { SyncServer } from './server';

const PORT = parseInt(process.env.PORT || '4444', 10);

const syncServer = new SyncServer();

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && (req.url === '/health' || req.url === '/api/health')) {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store',
    });
    res.end(
      JSON.stringify({
        status: 'healthy',
        service: 'braid-sync-server',
        rooms: syncServer.getRoomCount(),
        connections: syncServer.getClientCount(),
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: Date.now(),
      })
    );
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Braid Sync Server — WebSocket endpoint is ready.');
});

const wss = new WebSocketServer({ server });
syncServer.attachWebSocketServer(wss);

server.listen(PORT, () => {
  console.log(`[Braid SyncServer] Service running on port ${PORT}`);
  console.log(`  - WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`  - Health check: http://localhost:${PORT}/health`);
});

process.on('SIGINT', () => {
  console.log('[Braid SyncServer] Shutting down...');
  wss.close(() => {
    server.close(() => {
      process.exit(0);
    });
  });
});
