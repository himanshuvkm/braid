import { NextRequest, NextResponse } from 'next/server';
import { getOAuthRedirectUrl, generateOAuthState, type OAuthProvider } from '../../../../../lib/oauth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

  if (provider !== 'google' && provider !== 'github') {
    return NextResponse.json({ error: 'Unsupported OAuth provider' }, { status: 400 });
  }

  const origin = request.nextUrl.origin;
  const from = request.nextUrl.searchParams.get('from') || '/dashboard';
  const state = generateOAuthState(provider as OAuthProvider, from);
  const redirectUrl = getOAuthRedirectUrl(provider as OAuthProvider, origin, state);

  const response = NextResponse.redirect(redirectUrl);

  // Set CSRF state cookie
  response.cookies.set('braid_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60, // 15 minutes
  });

  return response;
}
