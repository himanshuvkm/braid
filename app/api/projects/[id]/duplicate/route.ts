import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../../lib/auth';
import { getProject, getProjectRole, duplicateProject } from '../../../../../lib/db';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id: projectId } = await context.params;
    const user = await getCurrentUser();
    const ownerId = user?.id || 'user-himanshu';

    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { name } = body;

    const duplicated = await duplicateProject(projectId, ownerId, name);
    if (!duplicated) {
      return NextResponse.json({ error: 'Failed to duplicate project' }, { status: 500 });
    }

    return NextResponse.json({ project: duplicated }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
