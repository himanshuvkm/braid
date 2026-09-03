import crypto from 'node:crypto';

const SALT_BYTES = 16;
const KEY_BYTES = 64;
const SCRYPT_OPTIONS: crypto.ScryptOptions = {
  N: 16384, // CPU/memory cost
  r: 8,     // Block size
  p: 1,     // Parallelization
};

/**
 * Validate password requirements.
 * Enforces minimum 8 characters and non-empty.
 */
export function validatePasswordStrength(password: unknown): { valid: boolean; error?: string } {
  if (typeof password !== 'string') {
    return { valid: false, error: 'Password must be a string' };
  }
  if (!password || password.trim().length === 0) {
    return { valid: false, error: 'Password cannot be empty' };
  }
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }
  if (password.length > 128) {
    return { valid: false, error: 'Password must be at most 128 characters long' };
  }
  return { valid: true };
}

/**
 * Hash password using Node.js scrypt with unique cryptographically random salt.
 * Output format: scrypt$<saltHex>$<derivedKeyHex>
 */
export async function hashPassword(password: string): Promise<string> {
  const validation = validatePasswordStrength(password);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid password');
  }

  const salt = crypto.randomBytes(SALT_BYTES);

  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, KEY_BYTES, SCRYPT_OPTIONS, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`scrypt$${salt.toString('hex')}$${derivedKey.toString('hex')}`);
    });
  });
}

/**
 * Synchronous hash helper (useful for initialization/seeding).
 */
export function hashPasswordSync(password: string): string {
  const validation = validatePasswordStrength(password);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid password');
  }

  const salt = crypto.randomBytes(SALT_BYTES);
  const derivedKey = crypto.scryptSync(password, salt, KEY_BYTES, SCRYPT_OPTIONS);
  return `scrypt$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
}

/**
 * Verify password against stored scrypt hash using timingSafeEqual to prevent timing attacks.
 */
export async function verifyPassword(password: string, storedHash?: string | null): Promise<boolean> {
  if (!storedHash || typeof storedHash !== 'string' || !password) {
    return false;
  }

  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false;
  }

  const saltHex = parts[1];
  const storedKeyHex = parts[2];

  try {
    const salt = Buffer.from(saltHex, 'hex');
    const storedKeyBuffer = Buffer.from(storedKeyHex, 'hex');

    return new Promise((resolve) => {
      crypto.scrypt(password, salt, KEY_BYTES, SCRYPT_OPTIONS, (err, derivedKey) => {
        if (err) return resolve(false);
        if (derivedKey.length !== storedKeyBuffer.length) return resolve(false);

        const match = crypto.timingSafeEqual(derivedKey, storedKeyBuffer);
        resolve(match);
      });
    });
  } catch {
    return false;
  }
}
