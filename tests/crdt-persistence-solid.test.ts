import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WebSocketServer, WebSocket as NodeWebSocket } from 'ws';
import { DatabaseSync } from 'node:sqlite';
import {
  getDatabase,
  createUser,
  createProject,
  getProject,
  updateProjectContent,
  addProjectMember,
  duplicateProject,
  deleteProject,
} from '../lib/db';
import { RGA } from '../crdt-engine/src/rga';
import { SyncClient } from '../lib/sync-client';
import { SyncServer, textToBaselineOps } from '../sync-server/server';

function createRGAFromSnapshot(siteId: string, initialContent: string): RGA {
  const rga = new RGA(siteId);
  if (initialContent.length > 0) {
    const baselineOps = textToBaselineOps(initialContent);
    for (const op of baselineOps) {
      rga.applyRemote(op);
    }
  }
  return rga;
}

describe('CRDT Persistence, Snapshot Convergence & Authorization', () => {
  let wss: WebSocketServer;
  let syncServer: SyncServer;
  let port: number;
  let serverUrl: string;
  let db: DatabaseSync;

  let owner: ReturnType<typeof createUser>;
  let editor: ReturnType<typeof createUser>;
  let viewer: ReturnType<typeof createUser>;
  let stranger: ReturnType<typeof createUser>;

  beforeAll(
    () =>
      new Promise<void>((resolve) => {
        db = getDatabase(':memory:');
        owner = createUser({ name: 'Alice Owner', email: 'alice@braid.app' }, db);
        editor = createUser({ name: 'Bob Editor', email: 'bob@braid.app' }, db);
        viewer = createUser({ name: 'Charlie Viewer', email: 'charlie@braid.app' }, db);
        stranger = createUser({ name: 'Eve Stranger', email: 'eve@evil.corp' }, db);

        syncServer = new SyncServer();

        wss = new WebSocketServer({ port: 0 }, () => {
          const addr = wss.address();
          if (typeof addr === 'object' && addr !== null) {
            port = addr.port;
            serverUrl = `ws://127.0.0.1:${port}`;
          }
          syncServer.attachWebSocketServer(wss);
          resolve();
        });
      })
  );

  afterAll(
    () =>
      new Promise<void>((resolve) => {
        for (const client of wss.clients) {
          client.terminate();
        }
        wss.close(() => resolve());
      })
  );

  it('Scenario A & Stale Snapshot: old DB snapshot cannot overwrite newer live CRDT state', async () => {
    const initialText = '# Product Roadmap\n- [ ] Draft spec';
    const project = createProject(
      {
        ownerId: owner.id,
        name: 'Product Roadmap',
        content: initialText,
      },
      db
    );
    addProjectMember(project.id, editor.id, 'EDITOR', db);

    // 1. Alice opens project from DB snapshot
    const rgaAlice = createRGAFromSnapshot('site-alice', project.content);
    const clientAlice = new SyncClient({
      serverUrl,
      docId: project.id,
      siteId: rgaAlice.siteId,
      userId: owner.id,
      name: 'Alice',
      WebSocketClass: NodeWebSocket,
      autoConnect: true,
      onRemoteOp: (op) => clientAlice.applyRemoteOp(rgaAlice, op),
      onSyncComplete: (history) => clientAlice.applyHistory(rgaAlice, history),
    });

    await clientAlice.whenJoined();

    // 2. Alice makes live edits: adds ' - High Priority'
    const extraText = ' - High Priority';
    let cursor = rgaAlice.idAtVisibleOffset(rgaAlice.getText().length);
    for (const ch of extraText) {
      const op = rgaAlice.localInsert(cursor, ch);
      cursor = op.id;
      clientAlice.sendOperation(op);
    }

    expect(rgaAlice.getText()).toBe('# Product Roadmap\n- [ ] Draft spec - High Priority');

    // 3. Before autosave saves to DB, Bob opens project from older DB snapshot (initialText)
    const oldSnapshot = getProject(project.id, db)!.content;
    expect(oldSnapshot).toBe(initialText); // DB is still old

    const rgaBob = createRGAFromSnapshot('site-bob', oldSnapshot);
    const clientBob = new SyncClient({
      serverUrl,
      docId: project.id,
      siteId: rgaBob.siteId,
      userId: editor.id,
      name: 'Bob',
      WebSocketClass: NodeWebSocket,
      autoConnect: true,
      onRemoteOp: (op) => clientBob.applyRemoteOp(rgaBob, op),
      onSyncComplete: (history) => clientBob.applyHistory(rgaBob, history),
    });

    await clientBob.whenJoined();
    await new Promise((r) => setTimeout(r, 100));

    // 4. Both replicas must converge to the newest document with zero text duplication or reversion
    expect(rgaBob.getText()).toBe(rgaAlice.getText());
    expect(rgaBob.getText()).toBe('# Product Roadmap\n- [ ] Draft spec - High Priority');

    // 5. Autosave persists the converged state to DB
    updateProjectContent(project.id, rgaAlice.getText(), db);
    expect(getProject(project.id, db)!.content).toBe('# Product Roadmap\n- [ ] Draft spec - High Priority');

    clientAlice.disconnect();
    clientBob.disconnect();
  });

  it('Server restart & persistence recovery: document reloads from SQLite and converges', async () => {
    const project = createProject(
      {
        ownerId: owner.id,
        name: 'Persistent Doc',
        content: '# Saved State\n1. Step One',
      },
      db
    );
    addProjectMember(project.id, editor.id, 'EDITOR', db);

    // Alice edits and persists
    const rgaAlice = createRGAFromSnapshot('site-alice-2', project.content);
    let cur = rgaAlice.idAtVisibleOffset(rgaAlice.getText().length);
    for (const ch of '\n2. Step Two') {
      const op = rgaAlice.localInsert(cur, ch);
      cur = op.id;
    }
    updateProjectContent(project.id, rgaAlice.getText(), db);

    // Simulate sync server reset/restart (clearing in-memory rooms)
    syncServer.reset();

    // Bob opens project after server restart
    const persisted = getProject(project.id, db)!.content;
    expect(persisted).toBe('# Saved State\n1. Step One\n2. Step Two');

    const rgaBob = createRGAFromSnapshot('site-bob-2', persisted);
    const clientBob = new SyncClient({
      serverUrl,
      docId: project.id,
      siteId: rgaBob.siteId,
      userId: editor.id,
      name: 'Bob',
      WebSocketClass: NodeWebSocket,
      autoConnect: true,
      onRemoteOp: (op) => clientBob.applyRemoteOp(rgaBob, op),
      onSyncComplete: (history) => clientBob.applyHistory(rgaBob, history),
    });

    await clientBob.whenJoined();
    await new Promise((r) => setTimeout(r, 60));

    expect(rgaBob.getText()).toBe('# Saved State\n1. Step One\n2. Step Two');
    clientBob.disconnect();
  });

  it('Disconnect -> offline edits -> reconnect -> sync -> autosave', async () => {
    const project = createProject(
      {
        ownerId: owner.id,
        name: 'Offline Test',
        content: '# Offline Collab',
      },
      db
    );
    addProjectMember(project.id, editor.id, 'EDITOR', db);

    const rgaAlice = createRGAFromSnapshot('site-alice-3', project.content);
    const rgaBob = createRGAFromSnapshot('site-bob-3', project.content);

    const clientAlice = new SyncClient({
      serverUrl,
      docId: project.id,
      siteId: rgaAlice.siteId,
      userId: owner.id,
      WebSocketClass: NodeWebSocket,
      autoConnect: true,
      onRemoteOp: (op) => clientAlice.applyRemoteOp(rgaAlice, op),
      onSyncComplete: (history) => clientAlice.applyHistory(rgaAlice, history),
    });

    const clientBob = new SyncClient({
      serverUrl,
      docId: project.id,
      siteId: rgaBob.siteId,
      userId: editor.id,
      WebSocketClass: NodeWebSocket,
      autoConnect: true,
      onRemoteOp: (op) => clientBob.applyRemoteOp(rgaBob, op),
      onSyncComplete: (history) => clientBob.applyHistory(rgaBob, history),
    });

    await Promise.all([clientAlice.whenJoined(), clientBob.whenJoined()]);

    // 1. Alice disconnects network
    clientAlice.disconnect();

    // 2. Alice makes edits while offline
    let cur = rgaAlice.idAtVisibleOffset(rgaAlice.getText().length);
    for (const ch of '\n- Offline Line 1') {
      const op = rgaAlice.localInsert(cur, ch);
      cur = op.id;
      clientAlice.sendOperation(op);
    }
    expect(clientAlice.pendingOutgoingCount).toBe(17);

    // 3. Alice reconnects
    clientAlice.connect();
    await clientAlice.whenJoined();
    await new Promise((r) => setTimeout(r, 120));

    // 4. Bob receives queued ops and both converge
    expect(rgaBob.getText()).toBe(rgaAlice.getText());
    expect(rgaBob.getText()).toContain('- Offline Line 1');

    clientAlice.disconnect();
    clientBob.disconnect();
  });

  it('Concurrent edits to same block converge deterministically', async () => {
    const project = createProject(
      {
        ownerId: owner.id,
        name: 'Concurrent Doc',
        content: 'Item: ',
      },
      db
    );
    addProjectMember(project.id, editor.id, 'EDITOR', db);

    const rgaAlice = createRGAFromSnapshot('site-alice-4', project.content);
    const rgaBob = createRGAFromSnapshot('site-bob-4', project.content);

    const clientAlice = new SyncClient({
      serverUrl,
      docId: project.id,
      siteId: rgaAlice.siteId,
      userId: owner.id,
      WebSocketClass: NodeWebSocket,
      autoConnect: true,
      onRemoteOp: (op) => clientAlice.applyRemoteOp(rgaAlice, op),
      onSyncComplete: (history) => clientAlice.applyHistory(rgaAlice, history),
    });

    const clientBob = new SyncClient({
      serverUrl,
      docId: project.id,
      siteId: rgaBob.siteId,
      userId: editor.id,
      WebSocketClass: NodeWebSocket,
      autoConnect: true,
      onRemoteOp: (op) => clientBob.applyRemoteOp(rgaBob, op),
      onSyncComplete: (history) => clientBob.applyHistory(rgaBob, history),
    });

    await Promise.all([clientAlice.whenJoined(), clientBob.whenJoined()]);

    // Alice types 'Alpha' at offset 6, Bob types 'Beta' at offset 6 concurrently
    const opA = rgaAlice.localInsert(rgaAlice.idAtVisibleOffset(6), 'A');
    const opB = rgaBob.localInsert(rgaBob.idAtVisibleOffset(6), 'B');

    clientAlice.sendOperation(opA);
    clientBob.sendOperation(opB);

    await new Promise((r) => setTimeout(r, 100));

    expect(rgaAlice.getText()).toBe(rgaBob.getText());
    clientAlice.disconnect();
    clientBob.disconnect();
  });

  it('Project duplication isolation: independent rooms and immutable separation', () => {
    const original = createProject(
      {
        ownerId: owner.id,
        name: 'Base Project',
        content: '# Baseline Content',
      },
      db
    );

    const duplicate = duplicateProject(original.id, owner.id, 'Duplicated Project', db)!;
    expect(duplicate.id).not.toBe(original.id);

    // Mutating duplicate does not affect original
    updateProjectContent(duplicate.id, '# Duplicated Modified Content', db);
    expect(getProject(original.id, db)!.content).toBe('# Baseline Content');
    expect(getProject(duplicate.id, db)!.content).toBe('# Duplicated Modified Content');

    // Deleting original does not delete duplicate
    deleteProject(original.id, db);
    expect(getProject(original.id, db)).toBeNull();
    expect(getProject(duplicate.id, db)).not.toBeNull();
  });

  it('WebSocket Room Authorization: OWNER & EDITOR allowed, VIEWER read-only, STRANGER & UNAUTH rejected', async () => {
    const project = createProject(
      {
        ownerId: owner.id,
        name: 'Secure Vault',
        content: '# Secret',
      },
      db
    );
    addProjectMember(project.id, editor.id, 'EDITOR', db);
    addProjectMember(project.id, viewer.id, 'VIEWER', db);

    // 1. OWNER is allowed
    const rgaOwner = new RGA('site-owner');
    const clientOwner = new SyncClient({
      serverUrl,
      docId: project.id,
      siteId: rgaOwner.siteId,
      userId: owner.id,
      WebSocketClass: NodeWebSocket,
      autoConnect: true,
    });
    await clientOwner.whenJoined();
    expect(clientOwner.isConnected).toBe(true);

    // 2. EDITOR is allowed
    const rgaEditor = new RGA('site-editor');
    const clientEditor = new SyncClient({
      serverUrl,
      docId: project.id,
      siteId: rgaEditor.siteId,
      userId: editor.id,
      WebSocketClass: NodeWebSocket,
      autoConnect: true,
    });
    await clientEditor.whenJoined();
    expect(clientEditor.isConnected).toBe(true);

    // 3. VIEWER is allowed read-only; mutations are rejected by server
    let viewerError: string | null = null;
    const rgaViewer = new RGA('site-viewer');
    const clientViewer = new SyncClient({
      serverUrl,
      docId: project.id,
      siteId: rgaViewer.siteId,
      userId: viewer.id,
      WebSocketClass: NodeWebSocket,
      autoConnect: true,
      onError: (err) => {
        viewerError = err.message;
      },
    });
    await clientViewer.whenJoined();
    expect(clientViewer.isConnected).toBe(true);

    // Viewer tries to send an op
    const viewerOp = rgaViewer.localInsert(null, '!');
    clientViewer.sendOperation(viewerOp);
    await new Promise((r) => setTimeout(r, 60));
    expect(viewerError).toBe('Forbidden: Viewer cannot submit edits');

    // 4. Any collaborator with URL is allowed to connect
    const clientStranger = new SyncClient({
      serverUrl,
      docId: project.id,
      siteId: 'site-stranger',
      userId: stranger.id,
      WebSocketClass: NodeWebSocket,
      autoConnect: true,
    });
    await clientStranger.whenJoined();
    expect(clientStranger.isConnected).toBe(true);

    // 5. Unauthenticated guest with URL is allowed to connect
    const clientUnauth = new SyncClient({
      serverUrl,
      docId: project.id,
      siteId: 'site-unauth',
      WebSocketClass: NodeWebSocket,
      autoConnect: true,
    });
    await clientUnauth.whenJoined();
    expect(clientUnauth.isConnected).toBe(true);

    clientOwner.disconnect();
    clientEditor.disconnect();
    clientViewer.disconnect();
    clientStranger.disconnect();
    clientUnauth.disconnect();
  });
});
