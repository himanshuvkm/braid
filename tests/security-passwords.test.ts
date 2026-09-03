import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../lib/password';
import { createUser, getUserById, getDatabase } from '../lib/db';

describe('Phase 2 Security: Password Hashing & Requirements', () => {
  it('enforces minimum 8-character password requirement and rejects empty or malformed passwords', () => {
    expect(validatePasswordStrength('')).toEqual({ valid: false, error: 'Password cannot be empty' });
    expect(validatePasswordStrength('   ')).toEqual({ valid: false, error: 'Password cannot be empty' });
    expect(validatePasswordStrength('short')).toEqual({ valid: false, error: 'Password must be at least 8 characters long' });
    expect(validatePasswordStrength(12345)).toEqual({ valid: false, error: 'Password must be a string' });
    expect(validatePasswordStrength('validpassword123')).toEqual({ valid: true });
  });

  it('hashes passwords using scrypt with unique cryptographic salt per password', async () => {
    const password = 'SuperSecretPassword!2026';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    // Both are scrypt format
    expect(hash1).toMatch(/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/);
    expect(hash2).toMatch(/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/);

    // Salts and resulting hashes must differ even for identical input passwords
    expect(hash1).not.toBe(hash2);
  });

  it('verifies correct passwords and rejects incorrect passwords accurately with timing-safe comparison', async () => {
    const password = 'correct-horse-battery-staple';
    const hash = await hashPassword(password);

    const isMatch = await verifyPassword(password, hash);
    expect(isMatch).toBe(true);

    const wrongMatch = await verifyPassword('wrong-password', hash);
    expect(wrongMatch).toBe(false);

    const emptyMatch = await verifyPassword('', hash);
    expect(emptyMatch).toBe(false);
  });

  it('stores only the scrypt password hash in SQLite, never plaintext passwords', async () => {
    const db = getDatabase(':memory:');
    const plaintextPassword = 'MySecretPlainTextPassword123';
    const passwordHash = await hashPassword(plaintextPassword);

    const user = createUser(
      {
        name: 'Alice Security',
        email: 'alice.sec@braid.app',
        passwordHash,
      },
      db
    );

    const fetched = getUserById(user.id, db);
    expect(fetched).not.toBeNull();
    expect(fetched?.password_hash).toBe(passwordHash);
    expect(fetched?.password_hash).not.toBe(plaintextPassword);
    expect(JSON.stringify(fetched)).not.toContain(plaintextPassword);

    const isValid = await verifyPassword(plaintextPassword, fetched?.password_hash);
    expect(isValid).toBe(true);
  });
});
