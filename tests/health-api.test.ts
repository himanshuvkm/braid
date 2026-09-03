import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../app/api/health/route';
import { setAdapter } from '../lib/db';
import { SqliteAdapter } from '../lib/db/sqlite-adapter';

describe('Health Check API Endpoint (/api/health)', () => {
  beforeEach(() => {
    // Inject healthy in-memory SQLite adapter
    setAdapter(new SqliteAdapter(':memory:'));
  });

  it('returns HTTP 200 with healthy status and database connection details', async () => {
    const response = await GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('healthy');
    expect(body.service).toBe('braid-app');
    expect(body.database.status).toBe('connected');
    expect(body.database.type).toBe('sqlite');
    expect(typeof body.timestamp).toBe('number');
  });

  it('returns HTTP 503 when database is unreachable or unhealthy', async () => {
    // Inject mock unhealthy adapter
    setAdapter({
      type: 'postgres',
      init: vi.fn(),
      close: vi.fn(),
      isHealthy: vi.fn().mockResolvedValue(false),
      createUser: vi.fn(),
      getUserById: vi.fn(),
      getUserByEmail: vi.fn(),
      createSession: vi.fn(),
      getSession: vi.fn(),
      deleteSession: vi.fn(),
      deleteSessionsForUser: vi.fn(),
      createProject: vi.fn(),
      getProject: vi.fn(),
      listProjectsForUser: vi.fn(),
      updateProjectName: vi.fn(),
      updateProjectContent: vi.fn(),
      deleteProject: vi.fn(),
      duplicateProject: vi.fn(),
      getProjectRole: vi.fn(),
      addProjectMember: vi.fn(),
      removeProjectMember: vi.fn(),
      listProjectMembers: vi.fn(),
    });

    const response = await GET();
    expect(response.status).toBe(503);

    const body = await response.json();
    expect(body.status).toBe('unhealthy');
    expect(body.database.status).toBe('disconnected');
    expect(body.database.type).toBe('postgres');
    expect(body.error).toContain('Database connectivity verification failed');
  });
});
