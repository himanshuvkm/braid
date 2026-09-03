import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { deleteSession, getSession } from '../../../../lib/db';
import { SESSION_COOKIE_NAME } from '../../../../lib/auth';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (sessionCookie?.value) {
      const session = await getSession(sessionCookie.value);
      if (session) {
        console.info(`[Security] User ${session.user.id} logged out. Invalidating session ${session.id}`);
      }
      await deleteSession(sessionCookie.value);
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Security] Logout error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
