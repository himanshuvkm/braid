import { describe, it, expect, beforeEach } from 'vitest';
import { createWebSocketToken, verifyWebSocketToken, getAuthSecret } from '../lib/ws-token';

describe('lib/ws-token: Cryptographic WebSocket Authentication Tokens', () => {
  const testUserId = 'usr-test-12345';
  const testSessionId = 'sess-abcdef9876543210';

  beforeEach(() => {
    delete process.env.AUTH_SECRET;
    delete process.env.SESSION_SECRET;
    delete process.env.DATABASE_URL;
  });

  it('mints and successfully verifies a valid short-lived WebSocket token', () => {
    const token = createWebSocketToken({
      userId: testUserId,
      sessionId: testSessionId,
      expiresInSeconds: 300,
    });

    expect(typeof token).toBe('string');
    expect(token).toContain('.');

    const result = verifyWebSocketToken(token);
    expect(result.valid).toBe(true);
    expect(result.payload).toBeDefined();
    expect(result.payload?.userId).toBe(testUserId);
    expect(result.payload?.sessionId).toBe(testSessionId);
    expect(result.payload?.purpose).toBe('ws-auth');
    expect(result.payload?.exp).toBeGreaterThan(Date.now());
  });

  it('rejects a token with tampered payload content', () => {
    const token = createWebSocketToken({
      userId: testUserId,
      sessionId: testSessionId,
    });

    const [payloadB64, sig] = token.split('.');
    const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
    // Attacker tampers with userId to impersonate another user
    decoded.userId = 'usr-victim-99999';
    const tamperedPayloadB64 = Buffer.from(JSON.stringify(decoded)).toString('base64url');
    const tamperedToken = `${tamperedPayloadB64}.${sig}`;

    const result = verifyWebSocketToken(tamperedToken);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid token signature');
  });

  it('rejects a token with a forged signature', () => {
    const token = createWebSocketToken({
      userId: testUserId,
      sessionId: testSessionId,
    });

    const [payloadB64] = token.split('.');
    const forgedToken = `${payloadB64}.forgedSignatureB64xyz`;

    const result = verifyWebSocketToken(forgedToken);
    expect(result.valid).toBe(false);
  });

  it('rejects an expired token', () => {
    // Mint token that expired 10 seconds ago
    const expiredToken = createWebSocketToken({
      userId: testUserId,
      sessionId: testSessionId,
      expiresInSeconds: -10,
    });

    const result = verifyWebSocketToken(expiredToken);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Token has expired');
  });

  it('rejects malformed token strings', () => {
    expect(verifyWebSocketToken('').valid).toBe(false);
    expect(verifyWebSocketToken('not-a-token').valid).toBe(false);
    expect(verifyWebSocketToken('part1.part2.part3').valid).toBe(false);
  });

  it('deterministically derives shared secret from DATABASE_URL', () => {
    process.env.DATABASE_URL = 'postgresql://braid:secret123@db.internal:5432/braid';
    const secretFromDbUrl = getAuthSecret();
    expect(secretFromDbUrl).not.toBe('braid-insecure-dev-secret-change-in-production');
    expect(secretFromDbUrl.length).toBe(64); // SHA-256 hex digest

    // When signed with this secret, verification with same DATABASE_URL succeeds
    const token = createWebSocketToken({ userId: testUserId, sessionId: testSessionId });
    const verified = verifyWebSocketToken(token);
    expect(verified.valid).toBe(true);

    // If an explicit AUTH_SECRET is provided, it takes precedence
    process.env.AUTH_SECRET = 'explicit-super-secret-key-prod';
    expect(getAuthSecret()).toBe('explicit-super-secret-key-prod');
  });
});
