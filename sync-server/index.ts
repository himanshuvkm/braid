import http from 'node:http';
import { WebSocketServer } from 'ws';
import { SyncServer } from './server';

const PORT = parseInt(process.env.PORT || '4444', 10);
const isProd = process.env.NODE_ENV === 'production';
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim().toLowerCase())
  : [];

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

function verifyClient(
  info: { origin: string; secure: boolean; req: http.IncomingMessage },
  callback: (res: boolean, code?: number, message?: string) => void
): void {
  if (!isProd || allowedOrigins.length === 0) {
    // In development or when no strict origins specified, permit connection
    return callback(true);
  }

  const origin = info.origin?.toLowerCase();
  if (!origin) {
    // Permit non-browser monitoring or internal cluster probes
    return callback(true);
  }

  const isAllowed = allowedOrigins.some((allowed) => {
    if (allowed === origin) return true;
    if (allowed.startsWith('*.')) {
      const suffix = allowed.slice(1);
      try {
        const parsed = new URL(origin);
        return parsed.hostname.endsWith(suffix);
      } catch {
        return false;
      }
    }
    return false;
  });

  if (isAllowed) {
    callback(true);
  } else {
    console.warn(`[Security] Rejected WebSocket connection from unauthorized origin: ${info.origin}`);
    callback(false, 403, 'Forbidden: Origin not allowed');
  }
}

const wss = new WebSocketServer({ server, verifyClient });
syncServer.attachWebSocketServer(wss);

server.listen(PORT, () => {
  console.log(`[Braid SyncServer] Service running on port ${PORT}`);
  console.log(`  - WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`  - Health check: http://localhost:${PORT}/health`);
  if (allowedOrigins.length > 0) {
    console.log(`  - Allowed origins: ${allowedOrigins.join(', ')}`);
  }
});

let isShuttingDown = false;
async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`[Braid SyncServer] Received ${signal}. Starting graceful shutdown...`);

  try {
    await syncServer.close();
    console.log('[Braid SyncServer] Document snapshots successfully flushed to database.');
  } catch (err) {
    console.error('[Braid SyncServer] Error flushing snapshots on shutdown:', err);
  }

  for (const client of wss.clients) {
    try {
      client.close(1001, 'Server shutting down');
    } catch {}
  }

  wss.close(() => {
    server.close(() => {
      console.log('[Braid SyncServer] Shutdown complete.');
      process.exit(0);
    });
  });

  // Forced termination watchdog
  setTimeout(() => {
    console.error('[Braid SyncServer] Forced shutdown after timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
