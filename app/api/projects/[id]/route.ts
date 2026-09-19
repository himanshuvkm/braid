import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/auth';
import { getProject, getProjectRole, updateProjectName, deleteProject } from '../../../../lib/db';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id: projectId } = await context.params;
    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const user = await getCurrentUser();
    let role = 'OWNER';
    if (user) {
      const userRole = await getProjectRole(projectId, user.id);
      if (userRole) role = userRole;
    }

    return NextResponse.json({
      project: {
        ...project,
        role,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id: projectId } = await context.params;
    const body = await request.json();
    const { name } = body;

    if (name && typeof name === 'string') {
      await updateProjectName(projectId, name);
    }

    const updated = await getProject(projectId);
    return NextResponse.json({ project: updated });
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

    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const role = await getProjectRole(projectId, user.id);
    if (role !== 'OWNER') {
      return NextResponse.json({ error: 'Only the project owner can delete this project' }, { status: 403 });
    }

    await deleteProject(projectId);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
