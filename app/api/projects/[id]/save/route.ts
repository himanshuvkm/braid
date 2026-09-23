import { NextResponse } from 'next/server';
import { updateProjectContent } from '../../../../../lib/db';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id: projectId } = await context.params;
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
