import { NextResponse } from 'next/server';
import { getUserByEmail, createUser, createSession, deleteSession } from '../../../../lib/db';
import { SESSION_COOKIE_NAME } from '../../../../lib/auth';
import { hashPassword, validatePasswordStrength } from '../../../../lib/password';
import { checkRateLimit, getClientIp } from '../../../../lib/rate-limit';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`register:${ip}`, 5, 60000); // 5 attempts per minute
    if (!rateLimit.allowed) {
      console.warn(`[Security] Registration rate limit exceeded for IP ${ip}`);
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil(rateLimit.retryAfterMs / 1000)) },
        }
      );
    }

    const body = await request.json();
    const { name, email, password } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!email || typeof email !== 'string' || !email.trim() || !email.includes('@')) {
      return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 });
    }

    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return NextResponse.json({ error: passwordValidation.error }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await getUserByEmail(cleanEmail);
    if (existing) {
      // Safe response to prevent account enumeration / collision
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    const user = await createUser({
      name: name.trim(),
      email: cleanEmail,
      avatar: '👤',
      passwordHash,
    });

    console.info(`[Security] New user registered: ${user.id} (${cleanEmail}) from IP ${ip}`);

    // Session Fixation Protection: Rotate any existing cookie session
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(new RegExp(`(?:^|; )${SESSION_COOKIE_NAME}=([^;]*)`));
    if (match && match[1]) {
      try {
        await deleteSession(decodeURIComponent(match[1]));
      } catch {}
    }

    const session = await createSession(user.id);

    // Return safe user object (excluding password_hash)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash: _unused, ...safeUser } = user;

    const response = NextResponse.json({
      success: true,
      user: safeUser,
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
    const message = err instanceof Error ? err.message : 'Registration failed';
    console.error('[Security] Registration error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
