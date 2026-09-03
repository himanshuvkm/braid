import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { getDatabase, createUser, createSession, getSession, deleteSession } from '../lib/db';

describe('Phase 1 & 6 Security: Cryptographic Sessions & Expiration', () => {
  let db: DatabaseSync;
  let user: ReturnType<typeof createUser>;

  beforeEach(() => {
    db = getDatabase(':memory:');
    user = createUser({ name: 'Bob Session', email: 'bob.sec@braid.app' }, db);
  });

  it('generates cryptographically random 256-bit session IDs with high entropy', () => {
    const session1 = createSession(user.id, 30, db);
    const session2 = createSession(user.id, 30, db);

    expect(session1.id).toMatch(/^sess-[a-f0-9]{64}$/);
    expect(session2.id).toMatch(/^sess-[a-f0-9]{64}$/);
    expect(session1.id).not.toBe(session2.id);
  });

  it('enforces session expiration and automatically purges expired sessions on lookup', () => {
    // Create a session that expired 1 second ago (-1 ms TTL)
    const expiredSession = createSession(user.id, -1, db);

    const lookup = getSession(expiredSession.id, db);
    expect(lookup).toBeNull();

    // Verify row was deleted from SQLite database
    const rawCheck = db.prepare('SELECT * FROM sessions WHERE id = ?').get(expiredSession.id);
    expect(rawCheck).toBeUndefined();
  });

  it('deletes session from database on logout and prevents stolen session reuse', () => {
    const session = createSession(user.id, 30, db);
    expect(getSession(session.id, db)).not.toBeNull();

    // Invalidate session
    deleteSession(session.id, db);

    // After logout, session is gone from DB
    expect(getSession(session.id, db)).toBeNull();
  });
});
