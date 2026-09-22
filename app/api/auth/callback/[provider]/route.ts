import { NextRequest, NextResponse } from 'next/server';
import {
  parseAndValidateOAuthState,
  exchangeCodeForProfile,
  findOrCreateOAuthUser,
  type OAuthProvider,
} from '../../../../../lib/oauth';
import { SESSION_COOKIE_NAME } from '../../../../../lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

  if (provider !== 'google' && provider !== 'github') {
    return NextResponse.redirect(new URL('/login?error=Invalid+OAuth+Provider', request.url));
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, request.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/login?error=Missing+authorization+code', request.url));
  }

  // Validate state and CSRF
  const storedState = request.cookies.get('braid_oauth_state')?.value;
  const stateValidation = parseAndValidateOAuthState(state, provider as OAuthProvider);

  if (!stateValidation.valid || (storedState && storedState !== state)) {
    return NextResponse.redirect(new URL('/login?error=Invalid+or+expired+OAuth+state', request.url));
  }

  try {
    const origin = request.nextUrl.origin;
    const profile = await exchangeCodeForProfile(provider as OAuthProvider, code, origin);
    const { session } = await findOrCreateOAuthUser(profile);

    const targetUrl = new URL(stateValidation.from || '/dashboard', request.url);
    const response = NextResponse.redirect(targetUrl);

    // Set authenticated session cookie
    response.cookies.set(SESSION_COOKIE_NAME, session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    // Clear OAuth state cookie
    response.cookies.delete('braid_oauth_state');

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'OAuth authentication failed';
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, request.url));
  }
}
