import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../../lib/auth';
import { getProject, getProjectRole, updateProjectContent } from '../../../../../lib/db';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
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
    if (!role || (role !== 'OWNER' && role !== 'EDITOR')) {
      return NextResponse.json({ error: 'Forbidden: read-only access' }, { status: 403 });
    }

    const body = await request.json();
    const { content } = body;

    if (typeof content !== 'string') {
      return NextResponse.json({ error: 'Invalid content format' }, { status: 400 });
    }

    await updateProjectContent(projectId, content);

    return NextResponse.json({
      success: true,
      savedAt: Date.now(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
