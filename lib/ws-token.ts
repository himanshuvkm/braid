import crypto from 'node:crypto';

export interface WebSocketTokenPayload {
  userId: string;
  sessionId: string;
  iat: number;
  exp: number;
  purpose: 'ws-auth';
}

export interface VerifyTokenResult {
  valid: boolean;
  payload?: WebSocketTokenPayload;
  error?: string;
}

/**
 * Derives a shared cryptographic HMAC secret.
 * 1. Uses explicit AUTH_SECRET or SESSION_SECRET if present in environment.
 * 2. In production without explicit secret, deterministically hashes DATABASE_URL
 *    (which is shared between Vercel and Render).
 * 3. In local development or testing, falls back to a development secret.
 */
export function getAuthSecret(): string {
  if (process.env.AUTH_SECRET && process.env.AUTH_SECRET.trim().length > 0) {
    return process.env.AUTH_SECRET.trim();
  }
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim().length > 0) {
    return process.env.SESSION_SECRET.trim();
  }
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0) {
    return crypto
      .createHash('sha256')
      .update(`braid-auth-secret:${process.env.DATABASE_URL.trim()}`)
      .digest('hex');
  }
  return 'braid-insecure-dev-secret-change-in-production';
}

/**
 * Mint a short-lived, cryptographically signed token for cross-origin WebSocket authentication.
 * Default TTL is 300 seconds (5 minutes).
 */
export function createWebSocketToken(options: {
  userId: string;
  sessionId: string;
  expiresInSeconds?: number;
  secret?: string;
}): string {
  const { userId, sessionId, expiresInSeconds = 300, secret } = options;
  const now = Date.now();
  const payload: WebSocketTokenPayload = {
    userId,
    sessionId,
    iat: now,
    exp: now + expiresInSeconds * 1000,
    purpose: 'ws-auth',
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const hmacKey = secret || getAuthSecret();
  const signature = crypto
    .createHmac('sha256', hmacKey)
    .update(payloadB64)
    .digest('base64url');

  return `${payloadB64}.${signature}`;
}

/**
 * Verify the cryptographic HMAC signature, purpose, and expiration of a WebSocket token.
 * Uses constant-time comparison (crypto.timingSafeEqual) to prevent timing attacks.
 */
export function verifyWebSocketToken(token: string, secret?: string): VerifyTokenResult {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Token must be a non-empty string' };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, error: 'Malformed token structure' };
  }

  const [payloadB64, signature] = parts;
  if (!payloadB64 || !signature) {
    return { valid: false, error: 'Malformed token components' };
  }

  const hmacKey = secret || getAuthSecret();
  const expectedSignature = crypto
    .createHmac('sha256', hmacKey)
    .update(payloadB64)
    .digest('base64url');

  const sigBuffer = Buffer.from(signature, 'utf-8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');

  if (sigBuffer.length !== expectedBuffer.length) {
    return { valid: false, error: 'Invalid token signature length' };
  }

  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return { valid: false, error: 'Invalid token signature' };
  }

  try {
    const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf-8');
    const payload: WebSocketTokenPayload = JSON.parse(payloadJson);

    if (payload.purpose !== 'ws-auth') {
      return { valid: false, error: 'Invalid token purpose' };
    }

    if (!payload.userId || !payload.sessionId) {
      return { valid: false, error: 'Incomplete token payload' };
    }

    if (typeof payload.exp !== 'number' || payload.exp <= Date.now()) {
      return { valid: false, error: 'Token has expired' };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, error: 'Failed to decode token payload' };
  }
}
