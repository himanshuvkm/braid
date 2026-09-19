import crypto from 'node:crypto';
import { Pool, type PoolConfig } from 'pg';
import type {
  DatabaseAdapter,
  User,
  Session,
  Project,
  ProjectRole,
  ProjectWithRole,
  CreateUserData,
  CreateProjectData,
} from './types';
import { runMigrations } from './migrations';

export class PostgresAdapter implements DatabaseAdapter {
  readonly type = 'postgres' as const;
  private pool: Pool;
  private isInitialized = false;

  constructor(connectionStringOrConfig?: string | PoolConfig) {
    const baseConfig: Partial<PoolConfig> = {
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

    if (typeof connectionStringOrConfig === 'string') {
      this.pool = new Pool({
        ...baseConfig,
        connectionString: connectionStringOrConfig,
        ssl: process.env.NODE_ENV === 'production' && !connectionStringOrConfig.includes('localhost')
          ? { rejectUnauthorized: false }
          : undefined,
      });
    } else if (connectionStringOrConfig && typeof connectionStringOrConfig === 'object') {
      this.pool = new Pool({
        ...baseConfig,
        ...connectionStringOrConfig,
      });
    } else {
      const connStr = process.env.DATABASE_URL;
      if (!connStr) {
        throw new Error('[PostgresAdapter] DATABASE_URL environment variable is required');
      }
      this.pool = new Pool({
        ...baseConfig,
        connectionString: connStr,
        ssl: process.env.NODE_ENV === 'production' && !connStr.includes('localhost')
          ? { rejectUnauthorized: false }
          : undefined,
      });
    }
  }

  getPool(): Pool {
    return this.pool;
  }

  async init(): Promise<void> {
    if (this.isInitialized) return;
    await runMigrations(this);
    this.isInitialized = true;
  }

  async isHealthy(): Promise<boolean> {
    try {
      const res = await this.pool.query('SELECT 1 as healthy');
      return res.rows.length > 0;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    try {
      await this.pool.end();
    } catch {}
  }

  // ----------------- USER REPOSITORY -----------------

  async createUser(data: CreateUserData): Promise<User> {
    await this.init();
    const id = data.id || `user-${crypto.randomBytes(8).toString('hex')}`;
    const now = Date.now();
    const cleanEmail = data.email.toLowerCase().trim();

    await this.pool.query(
      `INSERT INTO users (id, name, email, avatar, password_hash, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, data.name.trim(), cleanEmail, data.avatar || null, data.passwordHash || null, now, now]
    );

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

  async getUserById(id: string): Promise<User | null> {
    await this.init();
    const res = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
    const row = res.rows[0];
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

  async getUserByEmail(email: string): Promise<User | null> {
    await this.init();
    const cleanEmail = email.toLowerCase().trim();
    const res = await this.pool.query('SELECT * FROM users WHERE email = $1', [cleanEmail]);
    const row = res.rows[0];
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

  async createSession(userId: string, ttlDays: number = 30): Promise<Session> {
    await this.init();
    const sessionId = `sess-${crypto.randomBytes(32).toString('hex')}`;
    const now = Date.now();
    const expiresAt = now + ttlDays * 24 * 60 * 60 * 1000;

    await this.pool.query(
      `INSERT INTO sessions (id, user_id, expires_at, created_at)
       VALUES ($1, $2, $3, $4)`,
      [sessionId, userId, expiresAt, now]
    );

    return {
      id: sessionId,
      user_id: userId,
      expires_at: expiresAt,
      created_at: now,
    };
  }

  async deleteSessionsForUser(userId: string): Promise<void> {
    await this.init();
    await this.pool.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
  }

  async getSession(sessionId: string): Promise<(Session & { user: User }) | null> {
    await this.init();
    const res = await this.pool.query(
      `SELECT 
         s.id as session_id, s.user_id, s.expires_at, s.created_at as session_created_at,
         u.id as u_id, u.name, u.email, u.avatar, u.password_hash, u.created_at as u_created_at, u.updated_at as u_updated_at
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = $1`,
      [sessionId]
    );

    const row = res.rows[0];
    if (!row) return null;

    const expiresAt = Number(row.expires_at);
    if (expiresAt < Date.now()) {
      await this.deleteSession(sessionId);
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

  async deleteSession(sessionId: string): Promise<void> {
    await this.init();
    await this.pool.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
  }

  // ----------------- PROJECT REPOSITORY -----------------

  async createProject(data: CreateProjectData): Promise<Project> {
    await this.init();
    const id = data.id || `proj-${Math.random().toString(36).substring(2, 10)}`;
    const now = Date.now();
    const name = data.name?.trim() || 'Untitled Document';
    const content = data.content ?? '# Untitled Document\n\nStart writing, or type / for commands...';

    await this.pool.query(
      `INSERT INTO projects (id, owner_id, name, content, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, data.ownerId, name, content, now, now]
    );

    await this.pool.query(
      `INSERT INTO project_members (id, project_id, user_id, role, created_at)
       VALUES ($1, $2, $3, 'OWNER', $4)
       ON CONFLICT (project_id, user_id) DO NOTHING`,
      [`pm-${id}-${data.ownerId}`, id, data.ownerId, now]
    );

    return {
      id,
      owner_id: data.ownerId,
      name,
      content,
      created_at: now,
      updated_at: now,
    };
  }

  async getProject(id: string): Promise<Project | null> {
    await this.init();
    const res = await this.pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    const row = res.rows[0];
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

  async listProjectsForUser(userId: string): Promise<ProjectWithRole[]> {
    await this.init();
    const res = await this.pool.query(
      `SELECT 
         p.id, p.owner_id, p.name, p.content, p.created_at, p.updated_at,
         COALESCE(pm.role, CASE WHEN p.owner_id = $1 THEN 'OWNER' ELSE NULL END) as role,
         u.name as owner_name, u.email as owner_email
       FROM projects p
       LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = $1
       JOIN users u ON p.owner_id = u.id
       WHERE p.owner_id = $1 OR pm.user_id = $1
       ORDER BY p.updated_at DESC`,
      [userId]
    );

    return res.rows.map((r) => ({
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

  async updateProjectName(id: string, name: string): Promise<boolean> {
    await this.init();
    const now = Date.now();
    await this.pool.query(
      'UPDATE projects SET name = $1, updated_at = $2 WHERE id = $3',
      [name.trim(), now, id]
    );
    return true;
  }

  async updateProjectContent(id: string, content: string): Promise<boolean> {
    await this.init();
    const now = Date.now();
    const existing = await this.getProject(id);
    if (!existing) {
      const userRes = await this.pool.query('SELECT id FROM users LIMIT 1');
      const ownerId = userRes.rows[0]?.id || 'user-himanshu';
      await this.pool.query(
        'INSERT INTO projects (id, owner_id, name, content, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, updated_at = EXCLUDED.updated_at',
        [id, ownerId, id, content, now, now]
      );
      return true;
    }
    await this.pool.query(
      'UPDATE projects SET content = $1, updated_at = $2 WHERE id = $3',
      [content, now, id]
    );
    return true;
  }

  async deleteProject(id: string): Promise<boolean> {
    await this.init();
    await this.pool.query('DELETE FROM projects WHERE id = $1', [id]);
    return true;
  }

  async duplicateProject(sourceProjectId: string, newOwnerId: string, newName?: string): Promise<Project | null> {
    const source = await this.getProject(sourceProjectId);
    if (!source) return null;

    const duplicatedName = newName?.trim() || `${source.name} (Copy)`;
    return this.createProject({
      ownerId: newOwnerId,
      name: duplicatedName,
      content: source.content,
    });
  }

  // ----------------- MEMBERS & AUTHORIZATION -----------------

  async getProjectRole(projectId: string, userId: string): Promise<ProjectRole | null> {
    const project = await this.getProject(projectId);
    if (!project) return null;
    if (project.owner_id === userId) return 'OWNER';

    const res = await this.pool.query(
      'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, userId]
    );
    const row = res.rows[0];
    if (!row) return null;
    return row.role as ProjectRole;
  }

  async addProjectMember(projectId: string, userId: string, role: 'EDITOR' | 'VIEWER'): Promise<void> {
    await this.init();
    const now = Date.now();
    await this.pool.query(
      `INSERT INTO project_members (id, project_id, user_id, role, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
      [`pm-${projectId}-${userId}`, projectId, userId, role, now]
    );
  }

  async removeProjectMember(projectId: string, userId: string): Promise<void> {
    await this.init();
    await this.pool.query(
      'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, userId]
    );
  }

  async listProjectMembers(projectId: string): Promise<Array<{ user: User; role: ProjectRole }>> {
    await this.init();
    const res = await this.pool.query(
      `SELECT pm.role, u.*
       FROM project_members pm
       JOIN users u ON pm.user_id = u.id
       JOIN projects p ON pm.project_id = p.id
       WHERE pm.project_id = $1 AND pm.user_id != p.owner_id`,
      [projectId]
    );

    return res.rows.map((r) => ({
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
}
