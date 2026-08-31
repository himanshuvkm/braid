import { NextResponse } from 'next/server';
import { getUserByEmail, getUserById, createUser, createSession } from '../../../../lib/db';
import { SESSION_COOKIE_NAME } from '../../../../lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, userId, name } = body;

    let user = null;

    if (userId) {
      user = getUserById(userId);
    } else if (email) {
      user = getUserByEmail(email);
    }

    // Auto-create account if user is logging in with a new email/name
    if (!user && (email || name)) {
      const userName = name || email?.split('@')[0] || 'Anonymous';
      const userEmail = email || `${userName.toLowerCase().replace(/[^a-z0-9]/g, '')}@braid.app`;
      user = getUserByEmail(userEmail);
      if (!user) {
        user = createUser({
          name: userName,
          email: userEmail,
          avatar: '👤',
        });
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found or invalid credentials' }, { status: 400 });
    }

    const session = createSession(user.id);

    const response = NextResponse.json({
      success: true,
      user,
    });

    response.cookies.set(SESSION_COOKIE_NAME, session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
