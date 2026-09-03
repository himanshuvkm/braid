/**
 * WebSocket configuration and URL resolution for Braid sync services.
 */

export function getWebSocketUrl(propUrl?: string): string {
  if (propUrl) return propUrl;
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;

  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && typeof window !== 'undefined') {
    // In production, fallback to standard same-origin WebSocket path rather than hardcoded 4444
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }

  // Local development default
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.hostname}:4444`;
  }

  return 'ws://localhost:4444';
}

export function validateWebSocketUrl(url: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') {
      return {
        valid: false,
        error: `Invalid WebSocket protocol: "${parsed.protocol}". Must use "ws:" or "wss:".`,
      };
    }
    if (process.env.NODE_ENV === 'production') {
      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
        return {
          valid: false,
          error: 'Production WebSocket URL must not point to localhost or loopback.',
        };
      }
      if (parsed.protocol !== 'wss:') {
        return {
          valid: false,
          error: 'Production WebSocket URL must use secure "wss:" protocol.',
        };
      }
    }
    return { valid: true };
  } catch {
    return { valid: false, error: `Malformed WebSocket URL: "${url}"` };
  }
}
