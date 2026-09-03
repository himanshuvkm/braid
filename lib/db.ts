import { DatabaseSync } from 'node:sqlite';
import type {
  User,
  Session,
  Project,
  ProjectMember,
  ProjectRole,
  ProjectWithRole,
  CreateUserData,
  CreateProjectData,
  DatabaseAdapter,
} from './db/types';
import { SqliteAdapter } from './db/sqlite-adapter';
import { PostgresAdapter } from './db/postgres-adapter';

// Re-export all models and adapter types
export type {
  User,
  Session,
  Project,
  ProjectMember,
  ProjectRole,
  ProjectWithRole,
  CreateUserData,
  CreateProjectData,
  DatabaseAdapter,
};
export { SqliteAdapter, PostgresAdapter };

let adapterInstance: DatabaseAdapter | null = null;

export function setAdapter(adapter: DatabaseAdapter | null): void {
  adapterInstance = adapter;
}

export function getAdapter(targetPathOrUrl?: string): DatabaseAdapter {
  if (adapterInstance && !targetPathOrUrl) {
    return adapterInstance;
  }

  const connStr = targetPathOrUrl || process.env.DATABASE_URL;
  if (connStr && (connStr.startsWith('postgres://') || connStr.startsWith('postgresql://'))) {
    adapterInstance = new PostgresAdapter(connStr);
    return adapterInstance;
  }

  const sqlite = new SqliteAdapter(targetPathOrUrl);
  adapterInstance = sqlite;
  return adapterInstance;
}

// Backward-compatibility helpers for DatabaseSync (SQLite-specific tests)
export function setDatabase(db: DatabaseSync | null): void {
  if (!db) {
    adapterInstance = null;
  } else {
    adapterInstance = new SqliteAdapter(db);
  }
}

export function getDatabase(dbPath?: string): DatabaseSync {
  const adapter = getAdapter(dbPath);
  if (adapter instanceof SqliteAdapter) {
    return adapter.getRawDb();
  }
  // If running against Postgres, fallback to an isolated SQLite for legacy sync tests
  return new SqliteAdapter(':memory:').getRawDb();
}

export function seedDefaultUsers(dbOrAdapter?: DatabaseSync | DatabaseAdapter): void {
  const adapter = resolveAdapter(dbOrAdapter);
  if (adapter instanceof SqliteAdapter) {
    adapter.seedDefaultUsers();
  }
}

function resolveAdapter(dbOrAdapter?: DatabaseSync | DatabaseAdapter): DatabaseAdapter {
  if (!dbOrAdapter) {
    return getAdapter();
  }
  if (typeof (dbOrAdapter as DatabaseAdapter).createUser === 'function') {
    return dbOrAdapter as DatabaseAdapter;
  }
  return new SqliteAdapter(dbOrAdapter as DatabaseSync);
}

// ----------------- OVERLOADED REPOSITORY DELEGATES -----------------

export function createUser(data: CreateUserData, db: PostgresAdapter): Promise<User>;
export function createUser(data: CreateUserData, db?: DatabaseSync | SqliteAdapter): User;
export function createUser(data: CreateUserData, db?: DatabaseSync | DatabaseAdapter): Promise<User> | User {
  return resolveAdapter(db).createUser(data);
}

export function getUserById(id: string, db: PostgresAdapter): Promise<User | null>;
export function getUserById(id: string, db?: DatabaseSync | SqliteAdapter): User | null;
export function getUserById(id: string, db?: DatabaseSync | DatabaseAdapter): Promise<User | null> | (User | null) {
  return resolveAdapter(db).getUserById(id);
}

export function getUserByEmail(email: string, db: PostgresAdapter): Promise<User | null>;
export function getUserByEmail(email: string, db?: DatabaseSync | SqliteAdapter): User | null;
export function getUserByEmail(email: string, db?: DatabaseSync | DatabaseAdapter): Promise<User | null> | (User | null) {
  return resolveAdapter(db).getUserByEmail(email);
}

export function createSession(userId: string, ttlDays: number, db: PostgresAdapter): Promise<Session>;
export function createSession(userId: string, ttlDays?: number, db?: DatabaseSync | SqliteAdapter): Session;
export function createSession(userId: string, ttlDays: number = 30, db?: DatabaseSync | DatabaseAdapter): Promise<Session> | Session {
  return resolveAdapter(db).createSession(userId, ttlDays);
}

export function deleteSessionsForUser(userId: string, db: PostgresAdapter): Promise<void>;
export function deleteSessionsForUser(userId: string, db?: DatabaseSync | SqliteAdapter): void;
export function deleteSessionsForUser(userId: string, db?: DatabaseSync | DatabaseAdapter): Promise<void> | void {
  return resolveAdapter(db).deleteSessionsForUser(userId);
}

export function getSession(sessionId: string, db: PostgresAdapter): Promise<(Session & { user: User }) | null>;
export function getSession(sessionId: string, db?: DatabaseSync | SqliteAdapter): (Session & { user: User }) | null;
export function getSession(sessionId: string, db?: DatabaseSync | DatabaseAdapter): Promise<(Session & { user: User }) | null> | ((Session & { user: User }) | null) {
  return resolveAdapter(db).getSession(sessionId);
}

export function deleteSession(sessionId: string, db: PostgresAdapter): Promise<void>;
export function deleteSession(sessionId: string, db?: DatabaseSync | SqliteAdapter): void;
export function deleteSession(sessionId: string, db?: DatabaseSync | DatabaseAdapter): Promise<void> | void {
  return resolveAdapter(db).deleteSession(sessionId);
}

export function createProject(data: CreateProjectData, db: PostgresAdapter): Promise<Project>;
export function createProject(data: CreateProjectData, db?: DatabaseSync | SqliteAdapter): Project;
export function createProject(data: CreateProjectData, db?: DatabaseSync | DatabaseAdapter): Promise<Project> | Project {
  return resolveAdapter(db).createProject(data);
}

export function getProject(id: string, db: PostgresAdapter): Promise<Project | null>;
export function getProject(id: string, db?: DatabaseSync | SqliteAdapter): Project | null;
export function getProject(id: string, db?: DatabaseSync | DatabaseAdapter): Promise<Project | null> | (Project | null) {
  return resolveAdapter(db).getProject(id);
}

export function listProjectsForUser(userId: string, db: PostgresAdapter): Promise<ProjectWithRole[]>;
export function listProjectsForUser(userId: string, db?: DatabaseSync | SqliteAdapter): ProjectWithRole[];
export function listProjectsForUser(userId: string, db?: DatabaseSync | DatabaseAdapter): Promise<ProjectWithRole[]> | ProjectWithRole[] {
  return resolveAdapter(db).listProjectsForUser(userId);
}

export function updateProjectName(id: string, name: string, db: PostgresAdapter): Promise<boolean>;
export function updateProjectName(id: string, name: string, db?: DatabaseSync | SqliteAdapter): boolean;
export function updateProjectName(id: string, name: string, db?: DatabaseSync | DatabaseAdapter): Promise<boolean> | boolean {
  return resolveAdapter(db).updateProjectName(id, name);
}

export function updateProjectContent(id: string, content: string, db: PostgresAdapter): Promise<boolean>;
export function updateProjectContent(id: string, content: string, db?: DatabaseSync | SqliteAdapter): boolean;
export function updateProjectContent(id: string, content: string, db?: DatabaseSync | DatabaseAdapter): Promise<boolean> | boolean {
  return resolveAdapter(db).updateProjectContent(id, content);
}

export function deleteProject(id: string, db: PostgresAdapter): Promise<boolean>;
export function deleteProject(id: string, db?: DatabaseSync | SqliteAdapter): boolean;
export function deleteProject(id: string, db?: DatabaseSync | DatabaseAdapter): Promise<boolean> | boolean {
  return resolveAdapter(db).deleteProject(id);
}

export function duplicateProject(sourceProjectId: string, newOwnerId: string, newName: string | undefined, db: PostgresAdapter): Promise<Project | null>;
export function duplicateProject(sourceProjectId: string, newOwnerId: string, newName?: string, db?: DatabaseSync | SqliteAdapter): Project | null;
export function duplicateProject(sourceProjectId: string, newOwnerId: string, newName?: string, db?: DatabaseSync | DatabaseAdapter): Promise<Project | null> | (Project | null) {
  return resolveAdapter(db).duplicateProject(sourceProjectId, newOwnerId, newName);
}

export function getProjectRole(projectId: string, userId: string, db: PostgresAdapter): Promise<ProjectRole | null>;
export function getProjectRole(projectId: string, userId: string, db?: DatabaseSync | SqliteAdapter): ProjectRole | null;
export function getProjectRole(projectId: string, userId: string, db?: DatabaseSync | DatabaseAdapter): Promise<ProjectRole | null> | (ProjectRole | null) {
  return resolveAdapter(db).getProjectRole(projectId, userId);
}

export function addProjectMember(projectId: string, userId: string, role: 'EDITOR' | 'VIEWER', db: PostgresAdapter): Promise<void>;
export function addProjectMember(projectId: string, userId: string, role: 'EDITOR' | 'VIEWER', db?: DatabaseSync | SqliteAdapter): void;
export function addProjectMember(projectId: string, userId: string, role: 'EDITOR' | 'VIEWER', db?: DatabaseSync | DatabaseAdapter): Promise<void> | void {
  return resolveAdapter(db).addProjectMember(projectId, userId, role);
}

export function removeProjectMember(projectId: string, userId: string, db: PostgresAdapter): Promise<void>;
export function removeProjectMember(projectId: string, userId: string, db?: DatabaseSync | SqliteAdapter): void;
export function removeProjectMember(projectId: string, userId: string, db?: DatabaseSync | DatabaseAdapter): Promise<void> | void {
  return resolveAdapter(db).removeProjectMember(projectId, userId);
}

export function listProjectMembers(projectId: string, db: PostgresAdapter): Promise<Array<{ user: User; role: ProjectRole }>>;
export function listProjectMembers(projectId: string, db?: DatabaseSync | SqliteAdapter): Array<{ user: User; role: ProjectRole }>;
export function listProjectMembers(projectId: string, db?: DatabaseSync | DatabaseAdapter): Promise<Array<{ user: User; role: ProjectRole }>> | Array<{ user: User; role: ProjectRole }> {
  return resolveAdapter(db).listProjectMembers(projectId);
}
