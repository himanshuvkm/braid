import type { DatabaseAdapter } from './types';
import { PostgresAdapter } from './postgres-adapter';
import { SqliteAdapter } from './sqlite-adapter';

export interface Migration {
  name: string;
  postgresSql: string;
  sqliteSql: string;
}

export const MIGRATIONS: Migration[] = [
  {
    name: '001_initial_schema',
    postgresSql: `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        applied_at BIGINT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        avatar TEXT,
        password_hash TEXT,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at BIGINT NOT NULL,
        created_at BIGINT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR(255) PRIMARY KEY,
        owner_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS project_members (
        id VARCHAR(255) PRIMARY KEY,
        project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL CHECK (role IN ('OWNER', 'EDITOR', 'VIEWER')),
        created_at BIGINT NOT NULL,
        CONSTRAINT uq_project_member UNIQUE (project_id, user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
      CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);
      CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
      CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
    `,
    sqliteSql: `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        applied_at INTEGER NOT NULL
      );

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
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS project_members (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('OWNER', 'EDITOR', 'VIEWER')),
        created_at INTEGER NOT NULL,
        UNIQUE(project_id, user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
      CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);
      CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
      CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
    `,
  },
];

export async function runMigrations(
  adapter: DatabaseAdapter
): Promise<{ applied: string[]; alreadyApplied: string[] }> {
  const applied: string[] = [];
  const alreadyApplied: string[] = [];

  if (adapter instanceof PostgresAdapter) {
    const pool = adapter.getPool();

    // Ensure schema_migrations table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        applied_at BIGINT NOT NULL
      );
    `);

    // Fetch applied migrations
    const res = await pool.query('SELECT name FROM schema_migrations ORDER BY id ASC');
    const appliedSet = new Set(res.rows.map((r) => r.name));

    for (const migration of MIGRATIONS) {
      if (appliedSet.has(migration.name)) {
        alreadyApplied.push(migration.name);
        continue;
      }

      // Execute within transaction
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(migration.postgresSql);
        await client.query(
          'INSERT INTO schema_migrations (name, applied_at) VALUES ($1, $2)',
          [migration.name, Date.now()]
        );
        await client.query('COMMIT');
        applied.push(migration.name);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`[Migration] Failed migration "${migration.name}": ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        client.release();
      }
    }
  } else if (adapter instanceof SqliteAdapter) {
    const rawDb = adapter.getRawDb();

    rawDb.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        applied_at INTEGER NOT NULL
      );
    `);

    const rows = rawDb.prepare('SELECT name FROM schema_migrations ORDER BY id ASC').all() as Array<{ name: string }>;
    const appliedSet = new Set(rows.map((r) => r.name));

    for (const migration of MIGRATIONS) {
      if (appliedSet.has(migration.name)) {
        alreadyApplied.push(migration.name);
        continue;
      }

      rawDb.exec(migration.sqliteSql);
      rawDb
        .prepare('INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)')
        .run(migration.name, Date.now());
      applied.push(migration.name);
    }
  }

  return { applied, alreadyApplied };
}
