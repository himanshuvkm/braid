import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import {
  getDatabase,
  createUser,
  createSession,
  getSession,
  deleteSession,
  createProject,
  setDatabase,
} from '../lib/db';
import { hashPassword, verifyPassword } from '../lib/password';
import { resetRateLimits } from '../lib/rate-limit';
import { SyncServer } from '../sync-server/server';
import type { ClientConnection, SyncMessage } from '../sync-server/server';

describe('Phase 20 Security: Full Auth & WebSocket Lifecycle Integration', () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = getDatabase(':memory:');
    setDatabase(db);
    resetRateLimits();
  });

  it('executes the full secure lifecycle: registration -> login -> project access -> WebSocket sync -> logout invalidation', async () => {
    // 1. User Registration
    const email = 'developer@braid.app';
    const password = 'ProductionPassword#2026';
    const passwordHash = await hashPassword(password);

    const user = createUser({
      name: 'Lead Developer',
      email,
      passwordHash,
    }, db);

    expect(user.id).toMatch(/^user-/);
    expect(user.password_hash).toBe(passwordHash);

    // 2. Failed Login Attempt (Wrong Password)
    const wrongAttempt = await verifyPassword('IncorrectPassword123', user.password_hash);
    expect(wrongAttempt).toBe(false);

    // 3. Successful Login
    const correctAttempt = await verifyPassword(password, user.password_hash);
    expect(correctAttempt).toBe(true);

    const session = createSession(user.id, 30, db);
    expect(session.id).toMatch(/^sess-[a-f0-9]{64}$/);

    // 4. Create Project
    const project = createProject({
      ownerId: user.id,
      name: 'Mission Critical Document',
      content: '# Mission Critical Document',
    }, db);

    // 5. Connect WebSocket with Session
    const syncServer = new SyncServer();
    const sentMessages: SyncMessage[] = [];
    let isClosed = false;

    const client: ClientConnection = {
      id: 'conn-lead-dev-1',
      authenticatedUserId: user.id,
      sessionId: session.id,
      send: (data: string) => {
        try {
          sentMessages.push(JSON.parse(data));
        } catch {}
      },
      close: () => {
        isClosed = true;
      },
    };

    const joined = await syncServer.joinRoom(project.id, client, {
      siteId: 'site-dev-1',
    });

    expect(joined).toBe(true);
    expect(isClosed).toBe(false);
    expect(client.role).toBe('OWNER');
    expect(sentMessages.some((m) => m.type === 'sync')).toBe(true);

    // 6. User logs out
    deleteSession(session.id, db);
    expect(getSession(session.id, db)).toBeNull();

    // 7. Subsequent WebSocket connection with revoked session fails
    let isSecondClosed = false;
    const secondClient: ClientConnection = {
      id: 'conn-lead-dev-2',
      sessionId: session.id, // Revoked session ID
      send: () => {},
      close: () => {
        isSecondClosed = true;
      },
    };

    const reconnectAllowed = await syncServer.joinRoom(project.id, secondClient, {
      siteId: 'site-dev-2',
      sessionId: session.id,
    });

    expect(reconnectAllowed).toBe(false);
    expect(isSecondClosed).toBe(true);

    syncServer.close();
  });
});
