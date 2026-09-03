import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../../lib/auth';
import {
  getProject,
  getProjectRole,
  getUserByEmail,
  addProjectMember,
  removeProjectMember,
  listProjectMembers,
} from '../../../../../lib/db';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id: projectId } = await context.params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = await getProjectRole(projectId, user.id);
    if (!role) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const members = await listProjectMembers(projectId);
    return NextResponse.json({ members });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id: projectId } = await context.params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = await getProjectRole(projectId, user.id);
    if (role !== 'OWNER') {
      return NextResponse.json({ error: 'Only project owners can invite members' }, { status: 403 });
    }

    const body = await request.json();
    const { email, role: memberRole } = body;

    if (!email || !memberRole) {
      return NextResponse.json({ error: 'Email and role are required' }, { status: 400 });
    }

    if (memberRole !== 'EDITOR' && memberRole !== 'VIEWER') {
      return NextResponse.json({ error: 'Role must be EDITOR or VIEWER' }, { status: 400 });
    }

    const targetUser = await getUserByEmail(email);
    if (!targetUser) {
      return NextResponse.json({ error: `User with email "${email}" not found` }, { status: 404 });
    }

    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.owner_id === targetUser.id) {
      return NextResponse.json({ error: 'User is already the project owner' }, { status: 400 });
    }

    await addProjectMember(projectId, targetUser.id, memberRole as 'EDITOR' | 'VIEWER');

    return NextResponse.json({ success: true, member: { user: targetUser, role: memberRole } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id: projectId } = await context.params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = await getProjectRole(projectId, user.id);
    if (role !== 'OWNER') {
      return NextResponse.json({ error: 'Only project owners can remove members' }, { status: 403 });
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    await removeProjectMember(projectId, userId);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
