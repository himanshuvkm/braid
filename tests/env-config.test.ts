import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateEnvironment } from '../lib/env';

describe('Environment Configuration Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('passes in local development with default SQLite and fallback port', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
    delete process.env.DATABASE_URL;
    delete process.env.NEXT_PUBLIC_WS_URL;

    const res = validateEnvironment();
    expect(res.valid).toBe(true);
    expect(res.env.databaseType).toBe('sqlite');
    expect(res.warnings.length).toBeGreaterThan(0);
  });

  it('fails in production when DATABASE_URL is missing', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    delete process.env.DATABASE_URL;

    const res = validateEnvironment();
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('DATABASE_URL is required in production'))).toBe(true);
  });

  it('rejects invalid DATABASE_URL scheme', () => {
    process.env.DATABASE_URL = 'mysql://user:pass@localhost/db';
    const res = validateEnvironment();
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('Invalid DATABASE_URL scheme'))).toBe(true);
  });

  it('accepts valid PostgreSQL connection strings', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    process.env.DATABASE_URL = 'postgresql://user:password@aws-rds.hostname:5432/braid?sslmode=require';
    process.env.NEXT_PUBLIC_WS_URL = 'wss://sync.braid.app';

    const res = validateEnvironment();
    expect(res.valid).toBe(true);
    expect(res.env.databaseType).toBe('postgres');
  });

  it('rejects malformed PORT values', () => {
    process.env.PORT = 'invalid-port';
    const res = validateEnvironment();
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('Invalid PORT configuration'))).toBe(true);
  });
});
