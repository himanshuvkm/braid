import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME } from '../../../../lib/auth';
import { getSession } from '../../../../lib/db';
import { createWebSocketToken } from '../../../../lib/ws-token';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    let userId: string = 'anon-' + Math.random().toString(36).substring(2, 9);
    let sessionId: string = 'guest-session';

    if (sessionCookie?.value) {
      const session = await getSession(sessionCookie.value);
      if (session) {
        userId = session.user.id;
        sessionId = session.id;
      }
    }

    const expiresInSeconds = 300; // 5 minutes
    const token = createWebSocketToken({
      userId,
      sessionId,
      expiresInSeconds,
    });

    return NextResponse.json({
      token,
      expiresIn: expiresInSeconds,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate token';
    console.error('[Security] ws-token generation error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
