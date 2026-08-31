import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import {
  getDatabase,
  createUser,
  getUserById,
  getUserByEmail,
  createSession,
  getSession,
  deleteSession,
  createProject,
  getProject,
  listProjectsForUser,
  updateProjectName,
  updateProjectContent,
  deleteProject,
  duplicateProject,
  addProjectMember,
  removeProjectMember,
  getProjectRole,
  listProjectMembers,
} from '../lib/db';

describe('User Accounts & Session Management', () => {
  let db: DatabaseSync;

  beforeEach(() => {
    // Isolated in-memory database for unit testing
    db = getDatabase(':memory:');
  });

  it('creates and retrieves a new user account with unique email', () => {
    const user = createUser(
      {
        name: 'Sarah Connor',
        email: 'sarah@braid.app',
        avatar: '🛡️',
      },
      db
    );

    expect(user.id).toMatch(/^user-/);
    expect(user.name).toBe('Sarah Connor');
    expect(user.email).toBe('sarah@braid.app');

    const byId = getUserById(user.id, db);
    expect(byId?.id).toBe(user.id);
    expect(byId?.name).toBe('Sarah Connor');

    const byEmail = getUserByEmail('sarah@braid.app', db);
    expect(byEmail?.id).toBe(user.id);
  });

  it('creates and validates persistent sessions', () => {
    const user = createUser({ name: 'Neo', email: 'neo@matrix.org' }, db);
    const session = createSession(user.id, 30, db);

    expect(session.id).toMatch(/^sess-/);
    expect(session.user_id).toBe(user.id);

    const retrieved = getSession(session.id, db);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.user.email).toBe('neo@matrix.org');

    // Deleting session
    deleteSession(session.id, db);
    expect(getSession(session.id, db)).toBeNull();
  });
});

describe('Project CRUD & Multi-Project Workspace', () => {
  let db: DatabaseSync;
  let owner: ReturnType<typeof createUser>;

  beforeEach(() => {
    db = getDatabase(':memory:');
    owner = createUser({ name: 'Alice', email: 'alice@braid.app' }, db);
  });

  it('creates, lists, renames, and retrieves project snapshots', () => {
    const project = createProject(
      {
        ownerId: owner.id,
        name: 'Q3 Product Roadmap',
        content: '# Q3 Product Roadmap\n- [ ] Ship Persistence',
      },
      db
    );

    expect(project.id).toMatch(/^proj-/);
    expect(project.owner_id).toBe(owner.id);
    expect(project.name).toBe('Q3 Product Roadmap');
    expect(project.content).toContain('Ship Persistence');

    // List projects for owner
    const projects = listProjectsForUser(owner.id, db);
    expect(projects.length).toBe(1);
    expect(projects[0].id).toBe(project.id);
    expect(projects[0].role).toBe('OWNER');

    // Rename project
    updateProjectName(project.id, 'Q3 Final Strategy', db);
    const updated = getProject(project.id, db);
    expect(updated?.name).toBe('Q3 Final Strategy');

    // Autosave / update content
    const newContent = '# Q3 Final Strategy\n- [x] Ship Persistence';
    updateProjectContent(project.id, newContent, db);
    const saved = getProject(project.id, db);
    expect(saved?.content).toBe(newContent);
  });

  it('duplicates a project into an independent snapshot', () => {
    const original = createProject(
      {
        ownerId: owner.id,
        name: 'Sprint Template',
        content: '# Sprint Template\n1. Task Alpha\n2. Task Beta',
      },
      db
    );

    const duplicate = duplicateProject(original.id, owner.id, 'Sprint 42 Plan', db);
    expect(duplicate).not.toBeNull();
    expect(duplicate?.id).not.toBe(original.id);
    expect(duplicate?.name).toBe('Sprint 42 Plan');
    expect(duplicate?.content).toBe(original.content);

    // Modifying duplicate does NOT alter original
    updateProjectContent(duplicate!.id, '# Modified Duplicate', db);
    expect(getProject(original.id, db)?.content).toBe(original.content);
    expect(getProject(duplicate!.id, db)?.content).toBe('# Modified Duplicate');
  });

  it('deletes a project cleanly and cascades associations', () => {
    const project = createProject({ ownerId: owner.id, name: 'Temporary Draft' }, db);
    expect(getProject(project.id, db)).not.toBeNull();

    deleteProject(project.id, db);
    expect(getProject(project.id, db)).toBeNull();

    const list = listProjectsForUser(owner.id, db);
    expect(list.find((p) => p.id === project.id)).toBeUndefined();
  });
});

describe('Project Authorization & Collaboration Permissions', () => {
  let db: DatabaseSync;
  let owner: ReturnType<typeof createUser>;
  let collaborator: ReturnType<typeof createUser>;
  let stranger: ReturnType<typeof createUser>;

  beforeEach(() => {
    db = getDatabase(':memory:');
    owner = createUser({ name: 'Alice', email: 'alice@braid.app' }, db);
    collaborator = createUser({ name: 'Bob', email: 'bob@braid.app' }, db);
    stranger = createUser({ name: 'Eve', email: 'eve@evil.corp' }, db);
  });

  it('enforces OWNER, EDITOR, and VIEWER roles correctly', () => {
    const project = createProject({ ownerId: owner.id, name: 'Secret Specs' }, db);

    // Owner role
    expect(getProjectRole(project.id, owner.id, db)).toBe('OWNER');

    // Stranger has no role
    expect(getProjectRole(project.id, stranger.id, db)).toBeNull();

    // Add collaborator as EDITOR
    addProjectMember(project.id, collaborator.id, 'EDITOR', db);
    expect(getProjectRole(project.id, collaborator.id, db)).toBe('EDITOR');

    // List members
    const members = listProjectMembers(project.id, db);
    expect(members.length).toBe(1);
    expect(members[0].user.id).toBe(collaborator.id);
    expect(members[0].role).toBe('EDITOR');

    // Collaborator sees project in their dashboard list
    const bobProjects = listProjectsForUser(collaborator.id, db);
    expect(bobProjects.length).toBe(1);
    expect(bobProjects[0].id).toBe(project.id);
    expect(bobProjects[0].role).toBe('EDITOR');

    // Stranger sees empty dashboard list
    const strangerProjects = listProjectsForUser(stranger.id, db);
    expect(strangerProjects.length).toBe(0);

    // Remove collaborator
    removeProjectMember(project.id, collaborator.id, db);
    expect(getProjectRole(project.id, collaborator.id, db)).toBeNull();
  });
});
