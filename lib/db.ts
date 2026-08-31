import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  password_hash?: string;
  created_at: number;
  updated_at: number;
}

export interface Session {
  id: string;
  user_id: string;
  expires_at: number;
  created_at: number;
}

export type ProjectRole = 'OWNER' | 'EDITOR' | 'VIEWER';

export interface Project {
  id: string;
  owner_id: string;
  name: string;
  content: string;
  created_at: number;
  updated_at: number;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectRole;
  created_at: number;
}

export interface ProjectWithRole extends Project {
  role: ProjectRole;
  owner_name?: string;
  owner_email?: string;
}

let dbInstance: DatabaseSync | null = null;

export function getDatabase(dbPath?: string): DatabaseSync {
  if (dbInstance && !dbPath) {
    return dbInstance;
  }

  let targetPath = dbPath;
  if (!targetPath) {
    if (process.env.BRAID_DB_MEMORY === 'true') {
      targetPath = ':memory:';
    } else {
      const dataDir = path.join(process.cwd(), '.data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      targetPath = path.join(dataDir, 'braid.db');
    }
  }

  const db = new DatabaseSync(targetPath);

  // Enable WAL mode & foreign keys for concurrency & integrity
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');

  // Initialize schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      avatar TEXT,
      password_hash TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      name TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS project_members (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('OWNER', 'EDITOR', 'VIEWER')),
      created_at INTEGER NOT NULL,
      UNIQUE(project_id, user_id),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);
    CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
  `);

  if (!dbPath) {
    dbInstance = db;
    seedDefaultUsers(db);
  }

  return db;
}

/**
 * Seed default demo accounts (Alice, Bob, Ajay) for frictionless local exploration & multi-peer testing
 */
export function seedDefaultUsers(db: DatabaseSync = getDatabase()): void {
  const defaultUsers = [
    {
      id: 'user-alice',
      name: 'Alice',
      email: 'alice@braid.app',
      avatar: '👩‍💻',
    },
    {
      id: 'user-bob',
      name: 'Bob',
      email: 'bob@braid.app',
      avatar: '👨‍🎨',
    },
    {
      id: 'user-Ajay',
      name: 'Ajay',
      email: 'Ajay@braid.app',
      avatar: '🚀',
    },
  ];

  const now = Date.now();
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO users (id, name, email, avatar, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const u of defaultUsers) {
    insertStmt.run(u.id, u.name, u.email, u.avatar, now, now);
  }
}

// ----------------- USER REPOSITORY -----------------

export function createUser(
  data: {
    id?: string;
    name: string;
    email: string;
    avatar?: string;
    passwordHash?: string;
  },
  db: DatabaseSync = getDatabase()
): User {
  const id = data.id || `user-${Math.random().toString(36).substring(2, 10)}`;
  const now = Date.now();
  const cleanEmail = data.email.toLowerCase().trim();

  const stmt = db.prepare(`
    INSERT INTO users (id, name, email, avatar, password_hash, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, data.name.trim(), cleanEmail, data.avatar || null, data.passwordHash || null, now, now);

  return {
    id,
    name: data.name.trim(),
    email: cleanEmail,
    avatar: data.avatar,
    password_hash: data.passwordHash,
    created_at: now,
    updated_at: now,
  };
}

export function getUserById(id: string, db: DatabaseSync = getDatabase()): User | null {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  const row = stmt.get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    avatar: row.avatar ? String(row.avatar) : undefined,
    password_hash: row.password_hash ? String(row.password_hash) : undefined,
    created_at: Number(row.created_at),
    updated_at: Number(row.updated_at),
  };
}

export function getUserByEmail(email: string, db: DatabaseSync = getDatabase()): User | null {
  const cleanEmail = email.toLowerCase().trim();
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  const row = stmt.get(cleanEmail) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    avatar: row.avatar ? String(row.avatar) : undefined,
    password_hash: row.password_hash ? String(row.password_hash) : undefined,
    created_at: Number(row.created_at),
    updated_at: Number(row.updated_at),
  };
}

// ----------------- SESSION REPOSITORY -----------------

export function createSession(
  userId: string,
  ttlDays: number = 30,
  db: DatabaseSync = getDatabase()
): Session {
  const sessionId = `sess-${Math.random().toString(36).substring(2, 12)}${Math.random().toString(36).substring(2, 12)}`;
  const now = Date.now();
  const expiresAt = now + ttlDays * 24 * 60 * 60 * 1000;

  const stmt = db.prepare(`
    INSERT INTO sessions (id, user_id, expires_at, created_at)
    VALUES (?, ?, ?, ?)
  `);

  stmt.run(sessionId, userId, expiresAt, now);

  return {
    id: sessionId,
    user_id: userId,
    expires_at: expiresAt,
    created_at: now,
  };
}

export function getSession(sessionId: string, db: DatabaseSync = getDatabase()): (Session & { user: User }) | null {
  const stmt = db.prepare(`
    SELECT 
      s.id as session_id, s.user_id, s.expires_at, s.created_at as session_created_at,
      u.id as u_id, u.name, u.email, u.avatar, u.password_hash, u.created_at as u_created_at, u.updated_at as u_updated_at
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ?
  `);

  const row = stmt.get(sessionId) as Record<string, unknown> | undefined;
  if (!row) return null;

  const expiresAt = Number(row.expires_at);
  if (expiresAt < Date.now()) {
    deleteSession(sessionId, db);
    return null;
  }

  return {
    id: String(row.session_id),
    user_id: String(row.user_id),
    expires_at: expiresAt,
    created_at: Number(row.session_created_at),
    user: {
      id: String(row.u_id),
      name: String(row.name),
      email: String(row.email),
      avatar: row.avatar ? String(row.avatar) : undefined,
      password_hash: row.password_hash ? String(row.password_hash) : undefined,
      created_at: Number(row.u_created_at),
      updated_at: Number(row.u_updated_at),
    },
  };
}

export function deleteSession(sessionId: string, db: DatabaseSync = getDatabase()): void {
  const stmt = db.prepare('DELETE FROM sessions WHERE id = ?');
  stmt.run(sessionId);
}

// ----------------- PROJECT REPOSITORY -----------------

export function createProject(
  data: {
    id?: string;
    ownerId: string;
    name?: string;
    content?: string;
  },
  db: DatabaseSync = getDatabase()
): Project {
  const id = data.id || `proj-${Math.random().toString(36).substring(2, 10)}`;
  const now = Date.now();
  const name = data.name?.trim() || 'Untitled Document';
  const content = data.content ?? '# Untitled Document\n\nStart writing, or type / for commands...';

  const insertProject = db.prepare(`
    INSERT INTO projects (id, owner_id, name, content, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertProject.run(id, data.ownerId, name, content, now, now);

  // Also add owner to project_members table
  const insertMember = db.prepare(`
    INSERT OR IGNORE INTO project_members (id, project_id, user_id, role, created_at)
    VALUES (?, ?, ?, 'OWNER', ?)
  `);
  insertMember.run(`pm-${id}-${data.ownerId}`, id, data.ownerId, now);

  return {
    id,
    owner_id: data.ownerId,
    name,
    content,
    created_at: now,
    updated_at: now,
  };
}

export function getProject(id: string, db: DatabaseSync = getDatabase()): Project | null {
  const stmt = db.prepare('SELECT * FROM projects WHERE id = ?');
  const row = stmt.get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    id: String(row.id),
    owner_id: String(row.owner_id),
    name: String(row.name),
    content: String(row.content),
    created_at: Number(row.created_at),
    updated_at: Number(row.updated_at),
  };
}

export function listProjectsForUser(userId: string, db: DatabaseSync = getDatabase()): ProjectWithRole[] {
  const stmt = db.prepare(`
    SELECT 
      p.id, p.owner_id, p.name, p.content, p.created_at, p.updated_at,
      COALESCE(pm.role, CASE WHEN p.owner_id = ? THEN 'OWNER' ELSE NULL END) as role,
      u.name as owner_name, u.email as owner_email
    FROM projects p
    LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = ?
    JOIN users u ON p.owner_id = u.id
    WHERE p.owner_id = ? OR pm.user_id = ?
    ORDER BY p.updated_at DESC
  `);

  const rows = stmt.all(userId, userId, userId, userId) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: String(r.id),
    owner_id: String(r.owner_id),
    name: String(r.name),
    content: String(r.content),
    created_at: Number(r.created_at),
    updated_at: Number(r.updated_at),
    role: (r.role as ProjectRole) || 'VIEWER',
    owner_name: String(r.owner_name),
    owner_email: String(r.owner_email),
  }));
}

export function updateProjectName(id: string, name: string, db: DatabaseSync = getDatabase()): boolean {
  const now = Date.now();
  const stmt = db.prepare('UPDATE projects SET name = ?, updated_at = ? WHERE id = ?');
  stmt.run(name.trim(), now, id);
  return true;
}

export function updateProjectContent(id: string, content: string, db: DatabaseSync = getDatabase()): boolean {
  const now = Date.now();
  const stmt = db.prepare('UPDATE projects SET content = ?, updated_at = ? WHERE id = ?');
  stmt.run(content, now, id);
  return true;
}

export function deleteProject(id: string, db: DatabaseSync = getDatabase()): boolean {
  const stmt = db.prepare('DELETE FROM projects WHERE id = ?');
  stmt.run(id);
  return true;
}

export function duplicateProject(
  sourceProjectId: string,
  newOwnerId: string,
  newName?: string,
  db: DatabaseSync = getDatabase()
): Project | null {
  const source = getProject(sourceProjectId, db);
  if (!source) return null;

  const duplicatedName = newName?.trim() || `${source.name} (Copy)`;
  return createProject(
    {
      ownerId: newOwnerId,
      name: duplicatedName,
      content: source.content,
    },
    db
  );
}

// ----------------- AUTHORIZATION & MEMBERS -----------------

export function getProjectRole(
  projectId: string,
  userId: string,
  db: DatabaseSync = getDatabase()
): ProjectRole | null {
  // Check direct owner
  const project = getProject(projectId, db);
  if (!project) return null;
  if (project.owner_id === userId) return 'OWNER';

  // Check project_members table
  const stmt = db.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?');
  const row = stmt.get(projectId, userId) as Record<string, unknown> | undefined;
  if (!row) return null;
  return row.role as ProjectRole;
}

export function addProjectMember(
  projectId: string,
  userId: string,
  role: 'EDITOR' | 'VIEWER',
  db: DatabaseSync = getDatabase()
): void {
  const now = Date.now();
  const stmt = db.prepare(`
    INSERT INTO project_members (id, project_id, user_id, role, created_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(project_id, user_id) DO UPDATE SET role = excluded.role
  `);
  stmt.run(`pm-${projectId}-${userId}`, projectId, userId, role, now);
}

export function removeProjectMember(
  projectId: string,
  userId: string,
  db: DatabaseSync = getDatabase()
): void {
  const stmt = db.prepare('DELETE FROM project_members WHERE project_id = ? AND user_id = ?');
  stmt.run(projectId, userId);
}

export function listProjectMembers(
  projectId: string,
  db: DatabaseSync = getDatabase()
): Array<{ user: User; role: ProjectRole }> {
  const stmt = db.prepare(`
    SELECT pm.role, u.*
    FROM project_members pm
    JOIN users u ON pm.user_id = u.id
    JOIN projects p ON pm.project_id = p.id
    WHERE pm.project_id = ? AND pm.user_id != p.owner_id
  `);

  const rows = stmt.all(projectId) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    role: r.role as ProjectRole,
    user: {
      id: String(r.id),
      name: String(r.name),
      email: String(r.email),
      avatar: r.avatar ? String(r.avatar) : undefined,
      password_hash: r.password_hash ? String(r.password_hash) : undefined,
      created_at: Number(r.created_at),
      updated_at: Number(r.updated_at),
    },
  }));
}
