import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { WebSocketServer, WebSocket as NodeWebSocket } from 'ws';
import { SyncServer } from '../sync-server/server';
import { SyncClient } from '../lib/sync-client';
import { RGA } from '../crdt-engine/src/index';
import {
  getDatabase,
  createUser,
  createSession,
  createProject,
  addProjectMember,
  setDatabase,
} from '../lib/db';
import { createWebSocketToken } from '../lib/ws-token';

describe('Editor Typing WebSocket Connection Stability & Regression Tests', () => {
  let db: DatabaseSync;
  let wss: WebSocketServer;
  let syncServer: SyncServer;
  let port: number;
  let serverUrl: string;

  let owner: ReturnType<typeof createUser>;
  let editor: ReturnType<typeof createUser>;
  let project: ReturnType<typeof createProject>;

  let editorSession: ReturnType<typeof createSession>;

  beforeEach(async () => {
    db = getDatabase(':memory:');
    setDatabase(db);

    owner = createUser({ name: 'Alice Owner', email: 'alice@braid.app' }, db);
    editor = createUser({ name: 'Bob Editor', email: 'bob@braid.app' }, db);

    createSession(owner.id, 30, db);
    editorSession = createSession(editor.id, 30, db);

    project = createProject({ ownerId: owner.id, name: 'Typing Stability Test', content: 'Initial' }, db);
    addProjectMember(project.id, editor.id, 'EDITOR', db);

    syncServer = new SyncServer();

    await new Promise<void>((resolve) => {
      wss = new WebSocketServer({ port: 0 }, () => {
        const addr = wss.address();
        if (typeof addr === 'object' && addr !== null) {
          port = addr.port;
          serverUrl = `ws://127.0.0.1:${port}`;
        }
        syncServer.attachWebSocketServer(wss);
        resolve();
      });
    });
  });

  afterEach(async () => {
    await syncServer.close();
    await new Promise<void>((resolve) => {
      for (const client of wss.clients) {
        client.terminate();
      }
      wss.close(() => resolve());
    });
  });

  it('authenticated connection opens, join succeeds, and one CRDT insert operation leaves socket open', async () => {
    const token = createWebSocketToken({
      userId: editor.id,
      sessionId: editorSession.id,
    });

    const rga = new RGA('site-bob');
    let closeEventsCount = 0;

    const client = new SyncClient({
      serverUrl,
      docId: project.id,
      siteId: rga.siteId,
      name: 'Bob',
      token,
      WebSocketClass: NodeWebSocket,
      autoConnect: false,
      onStatusChange: (status) => {
        if (status === 'disconnected') closeEventsCount++;
      },
    });

    await client.connect();
    await client.whenJoined();

    expect(client.isConnected).toBe(true);
    expect(client.connectionStatus).toBe('connected');
    const stableConnId = client.connectionId;
    expect(stableConnId).toBeTruthy();

    // Send single CRDT insert operation
    const op = rga.localInsert(null, 'H');
    client.sendOperation(op);

    // Wait 50ms and assert socket remains fully open on the same connection
    await new Promise((r) => setTimeout(r, 50));

    expect(client.isConnected).toBe(true);
    expect(client.connectionStatus).toBe('connected');
    expect(client.connectionId).toBe(stableConnId);
    expect(closeEventsCount).toBe(0);
    expect(syncServer.getClientCount()).toBe(1);

    client.disconnect();
  });

  it('multiple sequential typing operations remain on the exact same connection without disconnecting', async () => {
    const token = createWebSocketToken({
      userId: editor.id,
      sessionId: editorSession.id,
    });

    const rga = new RGA('site-bob');
    const statusHistory: string[] = [];

    const client = new SyncClient({
      serverUrl,
      docId: project.id,
      siteId: rga.siteId,
      name: 'Bob',
      token,
      WebSocketClass: NodeWebSocket,
      autoConnect: true,
      onStatusChange: (status) => {
        statusHistory.push(status);
      },
    });

    await client.whenJoined();
    expect(client.isConnected).toBe(true);
    const initialConnectionId = client.connectionId;

    // Simulate typing a sentence character-by-character
    const typedSentence = 'Collaborative editing in Braid!';
    let lastId: Parameters<RGA['localInsert']>[0] = null;

    for (const char of typedSentence) {
      const op = rga.localInsert(lastId, char);
      lastId = op.id;
      client.sendOperation(op);
      // Brief tick to simulate keystroke cadence
      await new Promise((r) => setTimeout(r, 5));
    }

    // Allow any message handling and snapshot debounce to settle
    await new Promise((r) => setTimeout(r, 50));

    // Must remain connected throughout typing with NO reconnect or disconnect
    expect(client.isConnected).toBe(true);
    expect(client.connectionStatus).toBe('connected');
    expect(client.connectionId).toBe(initialConnectionId);

    // Ensure status history never contained reconnecting or error during typing
    expect(statusHistory.filter((s) => s === 'reconnecting' || s === 'disconnected' || s === 'error')).toEqual([]);

    // Exactly ONE active WebSocket on server
    expect(syncServer.getClientCount()).toBe(1);

    client.disconnect();
  });

  it('reconnect only occurs after an actual network or server disconnect', async () => {
    const token = createWebSocketToken({
      userId: editor.id,
      sessionId: editorSession.id,
    });

    const rga = new RGA('site-bob');

    const client = new SyncClient({
      serverUrl,
      docId: project.id,
      siteId: rga.siteId,
      name: 'Bob',
      token,
      WebSocketClass: NodeWebSocket,
      autoConnect: true,
      reconnectIntervalMs: 50,
      maxReconnectIntervalMs: 150,
    });

    await client.whenJoined();
    expect(client.isConnected).toBe(true);
    const firstConnId = client.connectionId;

    // Type an operation
    const op = rga.localInsert(null, 'A');
    client.sendOperation(op);

    await new Promise((r) => setTimeout(r, 20));
    expect(client.connectionId).toBe(firstConnId);

    // Simulate an actual network / server termination
    for (const ws of wss.clients) {
      ws.terminate();
    }

    // Client should detect abnormal termination and reconnect automatically
    await new Promise((r) => setTimeout(r, 120));
    await client.whenJoined();

    expect(client.isConnected).toBe(true);
    expect(client.connectionStatus).toBe('connected');
    const secondConnId = client.connectionId;
    expect(secondConnId).not.toBe(firstConnId);
    expect(secondConnId).toContain(client.clientId);

    client.disconnect();
  });

  it('no duplicate WebSocket connections are created by rapid typing or operations', async () => {
    const token = createWebSocketToken({
      userId: editor.id,
      sessionId: editorSession.id,
    });

    const rga = new RGA('site-bob');

    const client = new SyncClient({
      serverUrl,
      docId: project.id,
      siteId: rga.siteId,
      name: 'Bob',
      token,
      WebSocketClass: NodeWebSocket,
      autoConnect: true,
    });

    await client.whenJoined();

    // Rapid burst of 50 operations in the same tick
    let prevId: Parameters<RGA['localInsert']>[0] = null;
    for (let i = 0; i < 50; i++) {
      const op = rga.localInsert(prevId, `x`);
      prevId = op.id;
      client.sendOperation(op);
    }

    await new Promise((r) => setTimeout(r, 50));

    // Ensure server only has exactly 1 client and socket was not recreated
    expect(syncServer.getClientCount()).toBe(1);
    expect(wss.clients.size).toBe(1);

    client.disconnect();
  });
});
