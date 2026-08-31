import { cookies } from 'next/headers';
import { getSession, createSession, deleteSession, type User, type ProjectRole, getProjectRole } from './db';

export const SESSION_COOKIE_NAME = 'braid_session';

/**
 * Retrieves the currently authenticated user from Next.js cookies (Server Components / Route Handlers)
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) {
      return null;
    }

    const sessionData = getSession(sessionCookie.value);
    if (!sessionData) {
      return null;
    }

    return sessionData.user;
  } catch {
    return null;
  }
}

/**
 * Enforces authentication. Returns User or throws error / returns null.
 */
export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}

/**
 * Enforces project authorization for the current user against required minimum role.
 */
export async function requireProjectAccess(
  projectId: string,
  requiredRole: 'VIEWER' | 'EDITOR' | 'OWNER' = 'VIEWER'
): Promise<{ user: User; role: ProjectRole }> {
  const user = await requireAuth();
  const role = getProjectRole(projectId, user.id);

  if (!role) {
    throw new Error('FORBIDDEN');
  }

  if (requiredRole === 'OWNER' && role !== 'OWNER') {
    throw new Error('FORBIDDEN');
  }

  if (requiredRole === 'EDITOR' && role !== 'OWNER' && role !== 'EDITOR') {
    throw new Error('FORBIDDEN');
  }

  return { user, role };
}

export { createSession, deleteSession };
