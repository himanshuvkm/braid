import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WebSocketServer, WebSocket as NodeWebSocket } from 'ws';
import { setAdapter } from '../lib/db';
import { SqliteAdapter } from '../lib/db/sqlite-adapter';
import { SyncServer } from '../sync-server/server';
import { SyncClient } from '../lib/sync-client';
import { RGA } from '../crdt-engine/src/rga';

describe('Production Deployment Multi-Client Simulation', () => {
  let adapter: SqliteAdapter;
  let wss: WebSocketServer;
  let syncServer: SyncServer;
  let port: number;
  let serverUrl: string;

  let ownerUser: { id: string; name: string };
  let editorUser: { id: string; name: string };
  let viewerUser: { id: string; name: string };
  let strangerUser: { id: string; name: string };

  let ownerSession: { id: string };
  let editorSession: { id: string };
  let strangerSession: { id: string };
  let viewerSession: { id: string };

  let project: { id: string; name: string; content: string };

  beforeAll(async () => {
    // 1. Initialize clean database adapter
    adapter = new SqliteAdapter(':memory:');
    setAdapter(adapter);

    // 2. Create users
    ownerUser = await adapter.createUser({ name: 'Owner User', email: 'owner@prod.app' });
    editorUser = await adapter.createUser({ name: 'Editor User', email: 'editor@prod.app' });
    viewerUser = await adapter.createUser({ name: 'Viewer User', email: 'viewer@prod.app' });
    strangerUser = await adapter.createUser({ name: 'Stranger User', email: 'stranger@prod.app' });

    // 3. Create sessions
    ownerSession = await adapter.createSession(ownerUser.id, 30);
    editorSession = await adapter.createSession(editorUser.id, 30);
    viewerSession = await adapter.createSession(viewerUser.id, 30);
    strangerSession = await adapter.createSession(strangerUser.id, 30);

    // 4. Create project & memberships
    project = await adapter.createProject({
      ownerId: ownerUser.id,
      name: 'Production Roadmap',
      content: 'Initial Roadmap Draft',
    });
    await adapter.addProjectMember(project.id, editorUser.id, 'EDITOR');
    await adapter.addProjectMember(project.id, viewerUser.id, 'VIEWER');

    // 5. Start WebSocket SyncServer
    await new Promise<void>((resolve) => {
      wss = new WebSocketServer({ port: 0 }, () => {
        const addr = wss.address() as { port: number };
        port = addr.port;
        serverUrl = `ws://127.0.0.1:${port}`;
        syncServer = new SyncServer();
        syncServer.attachWebSocketServer(wss);
        resolve();
      });
    });
  });

  afterAll(async () => {
    await syncServer?.close();
    if (wss) {
      for (const client of wss.clients) {
        try {
          client.terminate();
        } catch {}
      }
      await new Promise<void>((resolve) => {
        wss.close(() => resolve());
      });
    }
    await adapter?.close();
  });

  it('verifies multi-client concurrent collaboration, permissions, persistence, and restart recovery', async () => {
    // --- 1. Client A (Owner) and Client B (Editor) connect ---
    const rgaA = new RGA('site-a');
    const rgaB = new RGA('site-b');

    const clientA = new SyncClient({
      serverUrl,
      docId: project.id,
      siteId: 'site-a',
      userId: ownerUser.id,
      sessionId: ownerSession.id,
      WebSocketClass: NodeWebSocket as unknown as typeof WebSocket,
      autoConnect: true,
      onRemoteOp: (op) => {
        rgaA.applyRemote(op);
      },
      onSyncComplete: (history) => {
        for (const op of history) {
          rgaA.applyRemote(op);
        }
      },
    });

    const clientB = new SyncClient({
      serverUrl,
      docId: project.id,
      siteId: 'site-b',
      userId: editorUser.id,
      sessionId: editorSession.id,
      WebSocketClass: NodeWebSocket as unknown as typeof WebSocket,
      autoConnect: true,
      onRemoteOp: (op) => {
        rgaB.applyRemote(op);
      },
      onSyncComplete: (history) => {
        for (const op of history) {
          rgaB.applyRemote(op);
        }
      },
    });

    await Promise.all([clientA.whenJoined(), clientB.whenJoined()]);

    // Initial baseline content is seeded from database snapshot
    expect(rgaA.toString()).toBe('Initial Roadmap Draft');
    expect(rgaB.toString()).toBe('Initial Roadmap Draft');

    // --- 2. Collaborator connects via room URL ---
    const clientC = new SyncClient({
      serverUrl,
      docId: project.id,
      siteId: 'site-c',
      userId: strangerUser.id,
      sessionId: strangerSession.id,
      WebSocketClass: NodeWebSocket as unknown as typeof WebSocket,
      autoConnect: true,
    });

    await new Promise((r) => setTimeout(r, 200));
    expect(clientC.isConnected).toBe(true);
    clientC.disconnect();

    // --- 3. Concurrent edits from Client A and Client B ---
    // Client A appends ": Approved"
    const opA = rgaA.localInsert(null, '!');
    clientA.sendOperation(opA);

    // Client B inserts '?'
    const opB = rgaB.localInsert(null, '?');
    clientB.sendOperation(opB);

    // Allow network relay
    await new Promise((r) => setTimeout(r, 200));

    // Both clients converge deterministically
    expect(rgaA.toString()).toBe(rgaB.toString());

    // --- 4. Server snapshot persistence ---
    await syncServer.persistDocumentSnapshot(project.id);
    const updatedProject = await adapter.getProject(project.id);
    expect(updatedProject?.content).toBe(rgaA.toString());

    // --- 5. Server Restart Recovery Simulation ---
    // Stop server and clear in-memory history
    syncServer.reset();

    // Client D (Viewer) connects after server restart
    const rgaD = new RGA('site-d');
    let viewerError: { code?: number; message?: string } | null = null;

    const clientD = new SyncClient({
      serverUrl,
      docId: project.id,
      siteId: 'site-d',
      userId: viewerUser.id,
      sessionId: viewerSession.id,
      WebSocketClass: NodeWebSocket as unknown as typeof WebSocket,
      autoConnect: true,
      onSyncComplete: (history) => {
        for (const op of history) {
          rgaD.applyRemote(op);
        }
      },
      onError: (err) => {
        viewerError = err;
      },
    });

    await clientD.whenJoined();

    // Verified that baseline content was recovered from database snapshot
    expect(rgaD.toString()).toBe(rgaA.toString());

    // --- 6. Viewer read-only enforcement ---
    // Viewer attempts to send operation
    const opD = rgaD.localInsert(null, 'X');
    clientD.sendOperation(opD);

    await new Promise((r) => setTimeout(r, 200));
    // Server must reject viewer edit with 403 Forbidden
    expect(viewerError).not.toBeNull();
    expect(viewerError!.code).toBe(403);

    clientA.disconnect();
    clientB.disconnect();
    clientD.disconnect();
  });
});
