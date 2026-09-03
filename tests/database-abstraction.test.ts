import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SqliteAdapter } from '../lib/db/sqlite-adapter';
import { PostgresAdapter } from '../lib/db/postgres-adapter';
import type { DatabaseAdapter } from '../lib/db/types';

describe('Production Database Abstraction & Adapter Contract', () => {
  let adapter: DatabaseAdapter;

  beforeEach(() => {
    // Test contract using in-memory SQLite adapter
    adapter = new SqliteAdapter(':memory:');
  });

  afterEach(() => {
    adapter.close();
  });

  describe('Health Verification', () => {
    it('reports database adapter health status as true when online', async () => {
      const isHealthy = await adapter.isHealthy();
      expect(isHealthy).toBe(true);
      expect(adapter.type).toBe('sqlite');
    });
  });

  describe('User Repository', () => {
    it('creates, retrieves by ID, and retrieves by email', async () => {
      const user = await adapter.createUser({
        name: 'Ada Lovelace',
        email: 'ada@braid.app',
        avatar: '👩‍💻',
        passwordHash: 'hashed_password_sample',
      });

      expect(user.id).toMatch(/^user-/);
      expect(user.name).toBe('Ada Lovelace');
      expect(user.email).toBe('ada@braid.app');

      const byId = await adapter.getUserById(user.id);
      expect(byId?.id).toBe(user.id);
      expect(byId?.name).toBe('Ada Lovelace');

      const byEmail = await adapter.getUserByEmail('ada@braid.app');
      expect(byEmail?.id).toBe(user.id);

      const nonExistent = await adapter.getUserById('user-fake');
      expect(nonExistent).toBeNull();
    });
  });

  describe('Session Repository & Expiration', () => {
    it('creates and retrieves active session with joined user information', async () => {
      const user = await adapter.createUser({
        name: 'Alan Turing',
        email: 'alan@braid.app',
      });

      const session = await adapter.createSession(user.id, 30);
      expect(session.id).toMatch(/^sess-/);
      expect(session.user_id).toBe(user.id);

      const sessionWithUser = await adapter.getSession(session.id);
      expect(sessionWithUser).not.toBeNull();
      expect(sessionWithUser?.id).toBe(session.id);
      expect(sessionWithUser?.user.id).toBe(user.id);
      expect(sessionWithUser?.user.name).toBe('Alan Turing');
    });

    it('rejects expired sessions and cleans them up', async () => {
      const user = await adapter.createUser({
        name: 'Grace Hopper',
        email: 'grace@braid.app',
      });

      const expired = await adapter.createSession(user.id, -1); // expired yesterday
      const fetched = await adapter.getSession(expired.id);
      expect(fetched).toBeNull();
    });

    it('deletes session on logout', async () => {
      const user = await adapter.createUser({
        name: 'Katherine Johnson',
        email: 'katherine@braid.app',
      });

      const session = await adapter.createSession(user.id, 30);
      await adapter.deleteSession(session.id);

      const fetched = await adapter.getSession(session.id);
      expect(fetched).toBeNull();
    });
  });

  describe('Project CRUD & Snapshot Persistence', () => {
    it('creates project and assigns OWNER role automatically', async () => {
      const owner = await adapter.createUser({
        name: 'Margaret Hamilton',
        email: 'margaret@braid.app',
      });

      const project = await adapter.createProject({
        ownerId: owner.id,
        name: 'Apollo Flight Software',
        content: '# Apollo Guidance Computer\n\nReal-time asynchronous executive.',
      });

      expect(project.id).toMatch(/^proj-/);
      expect(project.name).toBe('Apollo Flight Software');

      const role = await adapter.getProjectRole(project.id, owner.id);
      expect(role).toBe('OWNER');

      const fetched = await adapter.getProject(project.id);
      expect(fetched?.content).toContain('Apollo Guidance Computer');
    });

    it('updates document snapshot content and preserves latest state', async () => {
      const owner = await adapter.createUser({
        name: 'Linus Torvalds',
        email: 'linus@braid.app',
      });

      const project = await adapter.createProject({
        ownerId: owner.id,
        name: 'Git Specs',
        content: 'Initial commit',
      });

      const updated = await adapter.updateProjectContent(project.id, 'Second commit with CRDT snapshots');
      expect(updated).toBe(true);

      const fetched = await adapter.getProject(project.id);
      expect(fetched?.content).toBe('Second commit with CRDT snapshots');
    });

    it('duplicates project with independent state and new owner', async () => {
      const owner1 = await adapter.createUser({ name: 'Alice Dev', email: 'alice.d@braid.app' });
      const owner2 = await adapter.createUser({ name: 'Bob Dev', email: 'bob.d@braid.app' });

      const original = await adapter.createProject({
        ownerId: owner1.id,
        name: 'Architecture Plan',
        content: '# Architecture\n\nOriginal draft',
      });

      const duplicated = await adapter.duplicateProject(original.id, owner2.id, 'Architecture Plan (Fork)');
      expect(duplicated).not.toBeNull();
      expect(duplicated?.id).not.toBe(original.id);
      expect(duplicated?.owner_id).toBe(owner2.id);
      expect(duplicated?.name).toBe('Architecture Plan (Fork)');
      expect(duplicated?.content).toBe('# Architecture\n\nOriginal draft');
    });
  });

  describe('Project Members & Role Enforcement', () => {
    it('manages project members with granular roles (EDITOR vs VIEWER)', async () => {
      const owner = await adapter.createUser({ name: 'Project Owner', email: 'owner@braid.app' });
      const editor = await adapter.createUser({ name: 'Editor User', email: 'editor@braid.app' });
      const viewer = await adapter.createUser({ name: 'Viewer User', email: 'viewer@braid.app' });

      const project = await adapter.createProject({
        ownerId: owner.id,
        name: 'Collaborative Doc',
      });

      await adapter.addProjectMember(project.id, editor.id, 'EDITOR');
      await adapter.addProjectMember(project.id, viewer.id, 'VIEWER');

      expect(await adapter.getProjectRole(project.id, owner.id)).toBe('OWNER');
      expect(await adapter.getProjectRole(project.id, editor.id)).toBe('EDITOR');
      expect(await adapter.getProjectRole(project.id, viewer.id)).toBe('VIEWER');

      const members = await adapter.listProjectMembers(project.id);
      expect(members.length).toBe(2);

      await adapter.removeProjectMember(project.id, viewer.id);
      expect(await adapter.getProjectRole(project.id, viewer.id)).toBeNull();
    });
  });

  describe('PostgresAdapter Structure', () => {
    it('instantiates PostgresAdapter class correctly with connection configuration', () => {
      const pgAdapter = new PostgresAdapter('postgresql://testuser:testpass@localhost:5432/testdb');
      expect(pgAdapter.type).toBe('postgres');
      expect(typeof pgAdapter.createUser).toBe('function');
      expect(typeof pgAdapter.getProject).toBe('function');
      expect(typeof pgAdapter.isHealthy).toBe('function');
    });
  });
});
