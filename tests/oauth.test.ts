import { describe, it, expect } from 'vitest';
import {
  getOAuthRedirectUrl,
  generateOAuthState,
  parseAndValidateOAuthState,
  findOrCreateOAuthUser,
  exchangeCodeForProfile,
  type OAuthUserProfile,
} from '../lib/oauth';
import { GET as oauthRedirectHandler } from '../app/api/auth/oauth/[provider]/route';
import { GET as oauthCallbackHandler } from '../app/api/auth/callback/[provider]/route';
import { NextRequest } from 'next/server';
import { getSession } from '../lib/db';

describe('OAuth 2.0 Google & GitHub Authentication System', () => {
  describe('OAuth Redirect URLs & Parameter Scopes', () => {
    it('generates compliant Google OAuth 2.0 redirect URL with openid, email, and profile scopes', () => {
      const state = generateOAuthState('google', '/dashboard');
      const urlString = getOAuthRedirectUrl('google', 'https://braid.app', state);
      const url = new URL(urlString);

      expect(url.hostname).toBe('accounts.google.com');
      expect(url.pathname).toBe('/o/oauth2/v2/auth');
      expect(url.searchParams.get('redirect_uri')).toBe('https://braid.app/api/auth/callback/google');
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('scope')).toBe('openid email profile');
      expect(url.searchParams.get('state')).toBe(state);
    });

    it('generates compliant GitHub OAuth 2.0 redirect URL with read:user and user:email scopes', () => {
      const state = generateOAuthState('github', '/doc-456');
      const urlString = getOAuthRedirectUrl('github', 'https://braid.app', state);
      const url = new URL(urlString);

      expect(url.hostname).toBe('github.com');
      expect(url.pathname).toBe('/login/oauth/authorize');
      expect(url.searchParams.get('redirect_uri')).toBe('https://braid.app/api/auth/callback/github');
      expect(url.searchParams.get('scope')).toBe('read:user user:email');
      expect(url.searchParams.get('state')).toBe(state);
    });
  });

  describe('CSRF State Token Generation & Cryptographic Validation', () => {
    it('generates, validates, and extracts target redirect path from valid state', () => {
      const state = generateOAuthState('google', '/project/proj-test-123');
      const validation = parseAndValidateOAuthState(state, 'google');

      expect(validation.valid).toBe(true);
      expect(validation.from).toBe('/project/proj-test-123');
    });

    it('rejects state token if provider mismatches (e.g. google state sent to github callback)', () => {
      const state = generateOAuthState('google', '/dashboard');
      const validation = parseAndValidateOAuthState(state, 'github');

      expect(validation.valid).toBe(false);
    });

    it('rejects malformed or tampered state tokens', () => {
      const validation = parseAndValidateOAuthState('invalid-tampered-token', 'google');
      expect(validation.valid).toBe(false);
    });
  });

  describe('User Provisioning & Session Creation', () => {
    it('provisions new user and creates persistent session for OAuth profile', async () => {
      const mockProfile: OAuthUserProfile = {
        provider: 'google',
        providerId: 'google-sub-998877',
        email: `alice.oauth.${Date.now()}@example.com`,
        name: 'Alice OAuth',
        avatar: 'https://lh3.googleusercontent.com/alice',
      };

      const { user, session } = await findOrCreateOAuthUser(mockProfile);

      expect(user.id).toBeDefined();
      expect(user.email).toBe(mockProfile.email);
      expect(user.name).toBe('Alice OAuth');
      expect(session.id).toBeDefined();

      const retrieved = await getSession(session.id);
      expect(retrieved?.user.email).toBe(mockProfile.email);
    });

    it('links to existing user if email is already registered', async () => {
      const sharedEmail = `existing.oauth.${Date.now()}@example.com`;
      const firstProfile: OAuthUserProfile = {
        provider: 'github',
        providerId: 'gh-12345',
        email: sharedEmail,
        name: 'Bob GitHub',
      };

      const { user: user1 } = await findOrCreateOAuthUser(firstProfile);

      const secondProfile: OAuthUserProfile = {
        provider: 'google',
        providerId: 'google-99999',
        email: sharedEmail,
        name: 'Bob Google',
      };

      const { user: user2 } = await findOrCreateOAuthUser(secondProfile);
      expect(user2.id).toBe(user1.id);
    });
  });

  describe('OAuth Route Handlers End-to-End', () => {
    it('OAuth redirect endpoint sets state cookie and returns 307 redirect to provider', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/oauth/google?from=/custom-doc');
      const res = await oauthRedirectHandler(req, { params: Promise.resolve({ provider: 'google' }) });

      expect(res.status).toBe(307);
      const location = res.headers.get('location');
      expect(location).toContain('accounts.google.com');

      const stateCookie = res.cookies.get('braid_oauth_state');
      expect(stateCookie).toBeDefined();
      expect(stateCookie?.value).toBeDefined();
    });

    it('OAuth callback endpoint handles authorization code, provisions session, and redirects to target', async () => {
      const state = generateOAuthState('google', '/target-document');
      const req = new NextRequest(
        `http://localhost:3000/api/auth/callback/google?code=mock-test-code-123&state=${encodeURIComponent(state)}`
      );

      // Attach matching cookie
      req.cookies.set('braid_oauth_state', state);

      const res = await oauthCallbackHandler(req, { params: Promise.resolve({ provider: 'google' }) });

      expect(res.status).toBe(307);
      const location = res.headers.get('location');
      expect(location).toContain('/target-document');

      const sessionCookie = res.cookies.get('braid_session');
      expect(sessionCookie).toBeDefined();
    });
  });
});
