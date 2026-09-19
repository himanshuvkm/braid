import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { SyncServer, extractSessionId } from '../sync-server/server';
import {
  getDatabase,
  createUser,
  createSession,
  createProject,
  addProjectMember,
  setDatabase,
} from '../lib/db';
import type { ClientConnection, SyncMessage } from '../sync-server/server';

interface MockClientWrapper {
  client: ClientConnection;
  sentMessages: SyncMessage[];
  isClosed: boolean;
}

describe('Phase 10, 11, 12 Security: WebSocket Authentication & Anti-Impersonation', () => {
  let db: DatabaseSync;
  let userA: ReturnType<typeof createUser>;
  let userB: ReturnType<typeof createUser>;
  let userViewer: ReturnType<typeof createUser>;
  let userEditor: ReturnType<typeof createUser>;
  let projectA: ReturnType<typeof createProject>;
  let syncServer: SyncServer;

  beforeEach(() => {
    db = getDatabase(':memory:');
    setDatabase(db);

    userA = createUser({ name: 'Alice Owner', email: 'alice.owner@braid.app' }, db);
    userB = createUser({ name: 'Bob Stranger', email: 'bob.stranger@braid.app' }, db);
    userEditor = createUser({ name: 'Charlie Editor', email: 'charlie.editor@braid.app' }, db);
    userViewer = createUser({ name: 'Dana Viewer', email: 'dana.viewer@braid.app' }, db);

    projectA = createProject({ ownerId: userA.id, name: 'Top Secret Project A' }, db);
    addProjectMember(projectA.id, userEditor.id, 'EDITOR', db);
    addProjectMember(projectA.id, userViewer.id, 'VIEWER', db);

    syncServer = new SyncServer();
  });

  afterEach(() => {
    syncServer.close();
  });

  function createMockClient(sessionId?: string): MockClientWrapper {
    const wrapper: MockClientWrapper = {
      sentMessages: [],
      isClosed: false,
      client: null as unknown as ClientConnection,
    };

    let authenticatedUserId: string | undefined;
    let userName: string | undefined;
    if (sessionId) {
      try {
        const stmt = db.prepare(`
          SELECT s.*, u.id as u_id, u.name as u_name 
          FROM sessions s JOIN users u ON s.user_id = u.id 
          WHERE s.id = ? AND s.expires_at > ?
        `);
        const row = stmt.get(sessionId, Date.now()) as Record<string, unknown> | undefined;
        if (row) {
          authenticatedUserId = String(row.u_id);
          userName = String(row.u_name);
        }
      } catch {}
    }

    wrapper.client = {
      id: `mock-conn-${Math.random().toString(36).substring(2, 8)}`,
      authenticatedUserId,
      sessionId,
      name: userName,
      send: (data: string) => {
        try {
          wrapper.sentMessages.push(JSON.parse(data));
        } catch {}
      },
      close: () => {
        wrapper.isClosed = true;
      },
    };

    return wrapper;
  }

  it('extracts session cookie properly from HTTP headers or query string', () => {
    const cookieHeader = 'other=foo; braid_session=sess-abc12345; user=bar';
    expect(extractSessionId(cookieHeader)).toBe('sess-abc12345');

    const urlWithQuery = 'ws://localhost:4444?sessionId=sess-query999';
    expect(extractSessionId(undefined, urlWithQuery)).toBe('sess-query999');
  });

  it('allows authenticated OWNER full read/write access to project room', async () => {
    const sessionA = createSession(userA.id, 30, db);
    const mock = createMockClient(sessionA.id);

    const allowed = await syncServer.joinRoom(projectA.id, mock.client, {
      siteId: 'site-owner-1',
    });

    expect(allowed).toBe(true);
    expect(mock.isClosed).toBe(false);
    expect(mock.client.role).toBe('OWNER');
    expect(mock.client.isReadOnly).toBe(false);
    expect(mock.sentMessages.some((m) => m.type === 'sync')).toBe(true);
  });

  it('allows authenticated EDITOR read/write access to project room', async () => {
    const sessionEditor = createSession(userEditor.id, 30, db);
    const mock = createMockClient(sessionEditor.id);

    const allowed = await syncServer.joinRoom(projectA.id, mock.client, {
      siteId: 'site-editor-1',
    });

    expect(allowed).toBe(true);
    expect(mock.isClosed).toBe(false);
    expect(mock.client.role).toBe('EDITOR');
    expect(mock.client.isReadOnly).toBe(false);
  });

  it('allows authenticated VIEWER read-only access and rejects mutations with 403', async () => {
    const sessionViewer = createSession(userViewer.id, 30, db);
    const mock = createMockClient(sessionViewer.id);

    const allowed = await syncServer.joinRoom(projectA.id, mock.client, {
      siteId: 'site-viewer-1',
    });

    expect(allowed).toBe(true);
    expect(mock.client.role).toBe('VIEWER');
    expect(mock.client.isReadOnly).toBe(true);

    // Viewer attempting to submit an edit op
    syncServer.handleOperation(mock.client, projectA.id, {
      type: 'insert',
      id: { counter: 1, siteId: 'site-viewer-1' },
      originId: null,
      value: 'H',
    });

    // Mutation must be rejected and error sent
    expect(mock.sentMessages.some((m) => m.type === 'error' && m.code === 403)).toBe(true);
  });

  it('allows unauthenticated guest connections with URL to join room', async () => {
    const mock = createMockClient(undefined); // No session

    const allowed = await syncServer.joinRoom(projectA.id, mock.client, {
      siteId: 'site-unauth',
    });

    expect(allowed).toBe(true);
    expect(mock.isClosed).toBe(false);
    expect(mock.sentMessages.some((m) => m.type === 'sync')).toBe(true);
  });

  it('allows connections with valid URL to join and receive document sync', async () => {
    const sessionB = createSession(userB.id, 30, db);
    const mock = createMockClient(sessionB.id);

    const allowed = await syncServer.joinRoom(projectA.id, mock.client, {
      siteId: 'site-collaborator',
    });

    expect(allowed).toBe(true);
    expect(mock.isClosed).toBe(false);
    expect(mock.sentMessages.some((m) => m.type === 'sync')).toBe(true);
  });
});
