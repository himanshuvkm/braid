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
  deleteSession,
} from '../lib/db';
import { createWebSocketToken } from '../lib/ws-token';

describe('Cross-Origin Production WebSocket Authentication & Token Handshake', () => {
  let db: DatabaseSync;
  let wss: WebSocketServer;
  let syncServer: SyncServer;
  let port: number;
  let serverUrl: string;

  let owner: ReturnType<typeof createUser>;
  let editor: ReturnType<typeof createUser>;
  let viewer: ReturnType<typeof createUser>;
  let stranger: ReturnType<typeof createUser>;
  let project: ReturnType<typeof createProject>;

  let ownerSession: ReturnType<typeof createSession>;
  let editorSession: ReturnType<typeof createSession>;
  let viewerSession: ReturnType<typeof createSession>;
  let strangerSession: ReturnType<typeof createSession>;

  beforeEach(async () => {
    db = getDatabase(':memory:');
    setDatabase(db);

    owner = createUser({ name: 'Alice Owner', email: 'alice@braid.app' }, db);
    editor = createUser({ name: 'Bob Editor', email: 'bob@braid.app' }, db);
    viewer = createUser({ name: 'Charlie Viewer', email: 'charlie@braid.app' }, db);
    stranger = createUser({ name: 'Eve Stranger', email: 'eve@braid.app' }, db);

    ownerSession = createSession(owner.id, 30, db);
    editorSession = createSession(editor.id, 30, db);
    viewerSession = createSession(viewer.id, 30, db);
    strangerSession = createSession(stranger.id, 30, db);

    project = createProject({ ownerId: owner.id, name: 'Cross-Origin Vault', content: 'Init' }, db);
    addProjectMember(project.id, editor.id, 'EDITOR', db);
    addProjectMember(project.id, viewer.id, 'VIEWER', db);

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

  it('allows authenticated user connecting with valid token from cross-origin to join project room', async () => {
    const token = createWebSocketToken({
      userId: owner.id,
      sessionId: ownerSession.id,
      expiresInSeconds: 300,
    });

    const client = new SyncClient({
      serverUrl,
      docId: project.id,
      siteId: 'site-alice',
      token,
      WebSocketClass: NodeWebSocket,
      autoConnect: true,
    });

    await client.whenJoined();
    expect(client.isConnected).toBe(true);
    expect(client.connectionStatus).toBe('connected');

    client.disconnect();
  });

  it('allows unauthenticated connection with room URL directly', async () => {
    const client = new SyncClient({
      serverUrl,
      docId: project.id,
      siteId: 'site-unauth',
      WebSocketClass: NodeWebSocket,
      autoConnect: true,
    });

    await client.whenJoined();

    expect(client.isConnected).toBe(true);
    expect(client.connectionStatus).toBe('connected');

    client.disconnect();
  });

  it('rejects connection with expired token with code 401', async () => {
    const expiredToken = createWebSocketToken({
      userId: owner.id,
      sessionId: ownerSession.id,
      expiresInSeconds: -10, // Expired
    });

    let errorCode: number | undefined;

    const client = new SyncClient({
      serverUrl,
      docId: project.id,
      siteId: 'site-expired',
      token: expiredToken,
      WebSocketClass: NodeWebSocket,
      autoConnect: true,
      onError: (err) => {
        errorCode = err.code;
      },
    });

    await new Promise((r) => setTimeout(r, 120));

    expect(client.isConnected).toBe(false);
    expect(client.connectionStatus).toBe('error');
    expect(errorCode).toBe(401);

    client.disconnect();
  });

  it('rejects connection with tampered/forged token signature with code 401', async () => {
    const validToken = createWebSocketToken({
      userId: owner.id,
      sessionId: ownerSession.id,
    });

    const [payload] = validToken.split('.');
    const forgedToken = `${payload}.forgedSignature12345`;

    let errorCode: number | undefined;

    const client = new SyncClient({
      serverUrl,
      docId: project.id,
      siteId: 'site-forged',
      token: forgedToken,
      WebSocketClass: NodeWebSocket,
      autoConnect: true,
      onError: (err) => {
        errorCode = err.code;
      },
    });

    await new Promise((r) => setTimeout(r, 120));

    expect(client.isConnected).toBe(false);
    expect(client.connectionStatus).toBe('error');
    expect(errorCode).toBe(401);

    client.disconnect();
  });

  it('allows any user with valid token/URL to collaborate in project', async () => {
    const strangerToken = createWebSocketToken({
      userId: stranger.id,
      sessionId: strangerSession.id,
    });

    const client = new SyncClient({
      serverUrl,
      docId: project.id,
      siteId: 'site-stranger',
      token: strangerToken,
      WebSocketClass: NodeWebSocket,
      autoConnect: true,
    });

    await new Promise((r) => setTimeout(r, 120));

    expect(client.isConnected).toBe(true);
    expect(client.connectionStatus).toBe('connected');

    client.disconnect();
  });

  it('enforces VIEWER role as read-only and allows EDITOR to submit mutations', async () => {
    // 1. Editor connects
    const editorToken = createWebSocketToken({
      userId: editor.id,
      sessionId: editorSession.id,
    });

    const rgaEditor = new RGA('site-editor');
    const clientEditor = new SyncClient({
      serverUrl,
      docId: project.id,
      siteId: rgaEditor.siteId,
      token: editorToken,
      WebSocketClass: NodeWebSocket,
      autoConnect: true,
    });
    await clientEditor.whenJoined();
    expect(clientEditor.isConnected).toBe(true);

    // 2. Viewer connects
    const viewerToken = createWebSocketToken({
      userId: viewer.id,
      sessionId: viewerSession.id,
    });

    let viewerError: string | null = null;
    const rgaViewer = new RGA('site-viewer');
    const clientViewer = new SyncClient({
      serverUrl,
      docId: project.id,
      siteId: rgaViewer.siteId,
      token: viewerToken,
      WebSocketClass: NodeWebSocket,
      autoConnect: true,
      onError: (err) => {
        viewerError = err.message;
      },
    });
    await clientViewer.whenJoined();
    expect(clientViewer.isConnected).toBe(true);

    // Editor submits an edit op -> allowed
    const editorOp = rgaEditor.localInsert(null, 'E');
    clientEditor.sendOperation(editorOp);
    await new Promise((r) => setTimeout(r, 80));

    // Viewer submits an edit op -> rejected with 403
    const viewerOp = rgaViewer.localInsert(null, 'V');
    clientViewer.sendOperation(viewerOp);
    await new Promise((r) => setTimeout(r, 80));

    expect(viewerError).toBe('Forbidden: Viewer cannot submit edits');

    clientEditor.disconnect();
    clientViewer.disconnect();
  });

  it('allows connection even if user session has expired (fallback to guest collaborator)', async () => {
    // Token is mathematically valid, but session was deleted from DB (e.g. user logged out)
    const token = createWebSocketToken({
      userId: owner.id,
      sessionId: ownerSession.id,
    });

    // Delete session from DB (simulating logout)
    deleteSession(ownerSession.id, db);

    const client = new SyncClient({
      serverUrl,
      docId: project.id,
      siteId: 'site-logged-out',
      token,
      WebSocketClass: NodeWebSocket,
      autoConnect: true,
    });

    await new Promise((r) => setTimeout(r, 120));

    expect(client.isConnected).toBe(true);
    expect(client.connectionStatus).toBe('connected');

    client.disconnect();
  });

  it('supports token retrieval and automatic token refresh via getToken on reconnect', async () => {
    let tokenFetchCount = 0;
    const getToken = async (): Promise<string | null> => {
      tokenFetchCount++;
      return createWebSocketToken({
        userId: owner.id,
        sessionId: ownerSession.id,
        expiresInSeconds: 300,
      });
    };

    const client = new SyncClient({
      serverUrl,
      docId: project.id,
      siteId: 'site-reconnect',
      getToken,
      WebSocketClass: NodeWebSocket,
      autoConnect: true,
      reconnectIntervalMs: 50,
    });

    await client.whenJoined();
    expect(client.isConnected).toBe(true);
    expect(tokenFetchCount).toBe(1);

    // Terminate the server-side socket to trigger a client reconnect
    for (const ws of wss.clients) {
      ws.close();
    }

    // Wait for reconnect cycle
    await new Promise((r) => setTimeout(r, 200));

    expect(tokenFetchCount).toBe(2); // Fetched a fresh token for reconnect!
    expect(client.isConnected).toBe(true);

    client.disconnect();
  });

  it('backward compatibility: allows same-origin or local development connection using sessionId directly', async () => {
    const client = new SyncClient({
      serverUrl,
      docId: project.id,
      siteId: 'site-legacy',
      sessionId: ownerSession.id,
      WebSocketClass: NodeWebSocket,
      autoConnect: true,
    });

    await client.whenJoined();
    expect(client.isConnected).toBe(true);

    client.disconnect();
  });
});
