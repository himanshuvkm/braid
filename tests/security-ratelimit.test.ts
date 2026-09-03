import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, resetRateLimits } from '../lib/rate-limit';

describe('Phase 9 Security: Rate Limiting on Auth Endpoints', () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it('allows requests within limit and throttles subsequent requests exceeding threshold', () => {
    const key = 'login:192.168.1.50';
    const limit = 5;
    const windowMs = 60000;

    // First 5 attempts should succeed
    for (let i = 1; i <= limit; i++) {
      const result = checkRateLimit(key, limit, windowMs);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(limit - i);
    }

    // 6th attempt must be throttled
    const blocked = checkRateLimit(key, limit, windowMs);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });
});
