import crypto from 'node:crypto';
import { getUserByEmail, createUser, createSession, type User, type Session } from './db';

export type OAuthProvider = 'google' | 'github';

export interface OAuthUserProfile {
  provider: OAuthProvider;
  providerId: string;
  email: string;
  name: string;
  avatar?: string;
}

export function getOAuthRedirectUrl(provider: OAuthProvider, baseUrl: string, state: string): string {
  const callbackUrl = `${baseUrl}/api/auth/callback/${provider}`;

  if (provider === 'google') {
    const clientId = process.env.GOOGLE_CLIENT_ID || 'mock-google-client-id';
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'online',
      prompt: 'select_account',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  if (provider === 'github') {
    const clientId = process.env.GITHUB_CLIENT_ID || 'mock-github-client-id';
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      scope: 'read:user user:email',
      state,
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  throw new Error(`Unsupported OAuth provider: ${provider}`);
}

export function generateOAuthState(provider: OAuthProvider, from: string = '/dashboard'): string {
  const randomBytes = crypto.randomBytes(16).toString('hex');
  const payload = JSON.stringify({
    provider,
    nonce: randomBytes,
    from,
    created: Date.now(),
  });
  return Buffer.from(payload).toString('base64url');
}

export function parseAndValidateOAuthState(
  state: string,
  expectedProvider: OAuthProvider
): { valid: boolean; from: string } {
  try {
    const decoded = Buffer.from(state, 'base64url').toString('utf8');
    const parsed = JSON.parse(decoded);

    if (parsed.provider !== expectedProvider) {
      return { valid: false, from: '/dashboard' };
    }

    // State valid for 15 minutes
    const now = Date.now();
    if (!parsed.created || now - parsed.created > 15 * 60 * 1000) {
      return { valid: false, from: '/dashboard' };
    }

    return { valid: true, from: parsed.from || '/dashboard' };
  } catch {
    return { valid: false, from: '/dashboard' };
  }
}

export async function exchangeCodeForProfile(
  provider: OAuthProvider,
  code: string,
  baseUrl: string
): Promise<OAuthUserProfile> {
  const callbackUrl = `${baseUrl}/api/auth/callback/${provider}`;

  if (provider === 'google') {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    // In development or when using mock test tokens
    if (!clientId || !clientSecret || code.startsWith('mock-') || code.startsWith('test-')) {
      return {
        provider: 'google',
        providerId: `google-${code || 'mock-user'}`,
        email: `google.user.${code || 'demo'}@braid.app`,
        name: 'Google User',
        avatar: 'G',
      };
    }

    // Real Google OAuth Token Exchange
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errData = await tokenRes.text();
      throw new Error(`Google token exchange failed: ${errData}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Fetch Google User Info
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userRes.ok) {
      throw new Error('Failed to retrieve Google user profile');
    }

    const userData = await userRes.json();
    return {
      provider: 'google',
      providerId: userData.sub,
      email: userData.email,
      name: userData.name || userData.email.split('@')[0],
      avatar: userData.picture,
    };
  }

  if (provider === 'github') {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    // In development or when using mock test tokens
    if (!clientId || !clientSecret || code.startsWith('mock-') || code.startsWith('test-')) {
      return {
        provider: 'github',
        providerId: `github-${code || 'mock-user'}`,
        email: `github.user.${code || 'demo'}@braid.app`,
        name: 'GitHub User',
        avatar: 'GH',
      };
    }

    // Real GitHub OAuth Token Exchange
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: callbackUrl,
      }),
    });

    if (!tokenRes.ok) {
      const errData = await tokenRes.text();
      throw new Error(`GitHub token exchange failed: ${errData}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error(tokenData.error_description || 'GitHub OAuth token exchange failed');
    }

    // Fetch GitHub User Profile
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'Braid-App',
      },
    });

    if (!userRes.ok) {
      throw new Error('Failed to retrieve GitHub user profile');
    }

    const userData = await userRes.json();
    let email = userData.email;

    // If email is private on GitHub profile, fetch user/emails
    if (!email) {
      const emailsRes = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'Braid-App',
        },
      });
      if (emailsRes.ok) {
        const emailsData = (await emailsRes.json()) as Array<{ email: string; primary: boolean; verified: boolean }>;
        const primary = emailsData.find((e) => e.primary && e.verified) || emailsData[0];
        if (primary) email = primary.email;
      }
    }

    if (!email) {
      email = `${userData.login}@users.noreply.github.com`;
    }

    return {
      provider: 'github',
      providerId: String(userData.id),
      email,
      name: userData.name || userData.login,
      avatar: userData.avatar_url,
    };
  }

  throw new Error(`Unsupported OAuth provider: ${provider}`);
}

export async function findOrCreateOAuthUser(profile: OAuthUserProfile): Promise<{ user: User; session: Session }> {
  let user = await getUserByEmail(profile.email);

  if (!user) {
    user = await createUser({
      email: profile.email,
      name: profile.name || profile.email.split('@')[0],
      avatar: profile.avatar || profile.name?.[0] || 'U',
      passwordHash: `oauth:${profile.provider}:${profile.providerId}`,
    });
  }

  const session = await createSession(user.id, 30);
  return { user, session };
}
