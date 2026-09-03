import { NextResponse } from 'next/server';
import { getUserByEmail, getUserById, createSession, deleteSession } from '../../../../lib/db';
import { SESSION_COOKIE_NAME } from '../../../../lib/auth';
import { verifyPassword } from '../../../../lib/password';
import { checkRateLimit, getClientIp } from '../../../../lib/rate-limit';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`login:${ip}`, 10, 60000); // 10 attempts per minute
    if (!rateLimit.allowed) {
      console.warn(`[Security] Login rate limit exceeded for IP ${ip}`);
      return NextResponse.json(
        { error: 'Too many failed login attempts. Please try again in 1 minute.' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil(rateLimit.retryAfterMs / 1000)) },
        }
      );
    }

    const body = await request.json();
    const { email, password, userId } = body;

    let user = null;

    // 1. Development-only 1-click demo profile access
    if (userId && process.env.NODE_ENV !== 'production') {
      user = await getUserById(userId);
    } else {
      // 2. Standard production credential verification
      if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
        return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
      }

      const cleanEmail = email.toLowerCase().trim();
      const existingUser = await getUserByEmail(cleanEmail);

      if (!existingUser || !existingUser.password_hash) {
        // Generic error to prevent account enumeration
        console.warn(`[Security] Failed login attempt for ${cleanEmail} from IP ${ip} (user not found)`);
        // Constant-time dummy verification to mitigate timing attacks
        await verifyPassword(password, '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy');
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }

      const passwordMatch = await verifyPassword(password, existingUser.password_hash);
      if (!passwordMatch) {
        console.warn(`[Security] Failed login attempt for ${cleanEmail} from IP ${ip} (invalid password)`);
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }

      user = existingUser;
    }

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    console.info(`[Security] User authenticated successfully: ${user.id} (${user.email}) from IP ${ip}`);

    // Session Fixation Protection: Rotate/delete any pre-existing session token
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(new RegExp(`(?:^|; )${SESSION_COOKIE_NAME}=([^;]*)`));
    if (match && match[1]) {
      try {
        await deleteSession(decodeURIComponent(match[1]));
      } catch {}
    }

    // Create fresh cryptographic session
    const session = await createSession(user.id);

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
    const message = err instanceof Error ? err.message : 'Login failed';
    console.error('[Security] Login error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
