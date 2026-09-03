import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SyncClient, type ConnectionStatus, type WebSocketLike } from '../lib/sync-client';
import { getWebSocketUrl, validateWebSocketUrl } from '../lib/ws-config';

class MockWebSocket implements WebSocketLike {
  readyState = 0; // CONNECTING
  onopen: ((event: unknown) => void) | null = null;
  onmessage: ((event: unknown) => void) | null = null;
  onclose: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  sentMessages: string[] = [];
  url: string;

  constructor(url: string) {
    this.url = url;
  }

  send(data: string) {
    this.sentMessages.push(data);
  }

  close(code = 1000, reason = 'Normal') {
    this.readyState = 3; // CLOSED
    this.onclose?.({ code, reason });
  }

  simulateOpen() {
    this.readyState = 1; // OPEN
    this.onopen?.({});
  }

  simulateMessage(msg: unknown) {
    this.onmessage?.({ data: JSON.stringify(msg) });
  }
}

describe('WebSocket Reliability, Diagnostics, & URL Resolution', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('URL Resolution & Validation', () => {
    it('prioritizes explicit component propUrl over environment variables', () => {
      process.env.NEXT_PUBLIC_WS_URL = 'wss://env.braid.app';
      const resolved = getWebSocketUrl('wss://custom.braid.app');
      expect(resolved).toBe('wss://custom.braid.app');
    });

    it('uses NEXT_PUBLIC_WS_URL when propUrl is omitted', () => {
      process.env.NEXT_PUBLIC_WS_URL = 'wss://sync.production.com';
      const resolved = getWebSocketUrl();
      expect(resolved).toBe('wss://sync.production.com');
    });

    it('falls back to ws://localhost:4444 in local development when unset', () => {
      delete process.env.NEXT_PUBLIC_WS_URL;
      (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
      const resolved = getWebSocketUrl();
      expect(resolved).toBe('ws://localhost:4444');
    });

    it('validates WebSocket URLs and rejects invalid protocols', () => {
      expect(validateWebSocketUrl('wss://sync.example.com').valid).toBe(true);
      expect(validateWebSocketUrl('ws://localhost:4444').valid).toBe(true);
      expect(validateWebSocketUrl('http://invalid.com').valid).toBe(false);
      expect(validateWebSocketUrl('not-a-url').valid).toBe(false);
    });

    it('rejects localhost WebSocket targets in production environment', () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
      const result = validateWebSocketUrl('ws://localhost:4444');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must not point to localhost');
    });
  });

  describe('Connection Lifecycle States', () => {
    it('transitions connecting -> connected -> reconnecting on server close', () => {
      const statusLog: ConnectionStatus[] = [];
      let activeSocket: MockWebSocket | null = null;

      const setActiveSocket = (s: MockWebSocket) => {
        activeSocket = s;
      };

      const client = new SyncClient({
        serverUrl: 'ws://localhost:4444',
        docId: 'doc-test-1',
        siteId: 'site-test-1',
        autoConnect: false,
        WebSocketClass: class extends MockWebSocket {
          constructor(url: string) {
            super(url);
            setActiveSocket(this);
          }
        },
        onStatusChange: (status) => statusLog.push(status),
      });

      // 1. Connect
      client.connect();
      expect(client.connectionStatus).toBe('connecting');

      // 2. Server Open
      activeSocket!.simulateOpen();
      expect(client.connectionStatus).toBe('connected');

      // 3. Server Close (with network available)
      activeSocket!.close(1006, 'Server restart');
      expect(client.connectionStatus).toBe('reconnecting');

      client.disconnect();
    });

    it('stops reconnect loops on 401 Unauthorized or 403 Forbidden', () => {
      let activeSocket: MockWebSocket | null = null;
      let caughtError: { message: string; code?: number } | null = null;
      const setActiveSocket = (s: MockWebSocket) => {
        activeSocket = s;
      };

      const client = new SyncClient({
        serverUrl: 'ws://localhost:4444',
        docId: 'proj-secret-1',
        siteId: 'site-test-2',
        autoConnect: false,
        WebSocketClass: class extends MockWebSocket {
          constructor(url: string) {
            super(url);
            setActiveSocket(this);
          }
        },
        onError: (err) => {
          caughtError = err;
        },
      });

      client.connect();
      activeSocket!.simulateOpen();

      // Server returns 403 authorization error
      activeSocket!.simulateMessage({
        type: 'error',
        docId: 'proj-secret-1',
        error: 'Forbidden: Access denied',
        code: 403,
      });

      expect(client.connectionStatus).toBe('error');
      expect((caughtError as { message: string; code?: number } | null)?.code).toBe(403);

      // Trigger socket close after error
      activeSocket!.close(1008, 'Policy violation');

      // Must remain in error state, not reconnecting!
      expect(client.connectionStatus).toBe('error');

      client.disconnect();
    });

    it('redacts sensitive query parameters like sessionId in connection logs', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const client = new SyncClient({
        serverUrl: 'ws://localhost:4444',
        docId: 'proj-1',
        siteId: 'site-1',
        sessionId: 'secret-session-token-xyz-123',
        autoConnect: false,
        WebSocketClass: MockWebSocket,
      });

      client.connect();

      const connectionLog = logSpy.mock.calls.find((call) =>
        String(call[0]).includes('[SyncClient] connecting')
      );

      expect(connectionLog).toBeDefined();
      expect(String(connectionLog?.[0])).toContain('[REDACTED]');
      expect(String(connectionLog?.[0])).not.toContain('secret-session-token-xyz-123');

      client.disconnect();
      logSpy.mockRestore();
    });
  });
});
