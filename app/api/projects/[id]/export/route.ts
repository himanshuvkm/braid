import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../../lib/auth';
import { getProject, getProjectRole, updateProjectContent } from '../../../../../lib/db';
import { parseDocument } from '../../../../../lib/document-model';
import { generateDocx } from '../../../../../lib/export/docx';
import { generatePdf } from '../../../../../lib/export/pdf';
import { sanitizeFilename, getContentDispositionHeader, ExportFormat } from '../../../../../lib/export/filename';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id: projectId } = await context.params;
    const project = (await getProject(projectId)) || {
      id: projectId,
      name: projectId,
      content: '',
      owner_id: 'guest',
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    let body: { format?: string; content?: string } = {};
    try {
      body = await request.json();
    } catch {
      // Body may be empty
    }

    const format = body?.format;
    if (format !== 'docx' && format !== 'pdf') {
      return NextResponse.json(
        { error: 'Invalid export format. Supported formats: "docx", "pdf"' },
        { status: 400 }
      );
    }

    const { content } = body;
    let exportContent = project.content || '';

    const user = await getCurrentUser();
    const role = user ? await getProjectRole(projectId, user.id) : undefined;

    // If client provided current editor content and is not an explicit VIEWER, use it and persist it
    if (typeof content === 'string') {
      exportContent = content;
      if (role !== 'VIEWER') {
        await updateProjectContent(projectId, content);
      }
    }

    // Parse into structured DocumentState (reusing Braid's canonical document model)
    const docState = parseDocument(exportContent);

    // If the parsed document title is the default fallback, prefer project name if custom
    if (docState.title === 'Untitled Document' && project.name && project.name !== 'Untitled Document') {
      docState.title = project.name;
    }

    const exportTitle =
      docState.title && docState.title !== 'Untitled Document'
        ? docState.title
        : project.name || 'Braid Document';

    const filename = sanitizeFilename(exportTitle, format as ExportFormat);
    const contentDisposition = getContentDispositionHeader(filename);

    let buffer: Buffer;
    let contentType: string;

    if (format === 'docx') {
      buffer = await generateDocx(docState);
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else {
      buffer = await generatePdf(docState);
      contentType = 'application/pdf';
    }

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': contentDisposition,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id: projectId } = await context.params;
    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const format = url.searchParams.get('format');
    if (format !== 'docx' && format !== 'pdf') {
      return NextResponse.json(
        { error: 'Invalid export format. Supported formats: "docx", "pdf"' },
        { status: 400 }
      );
    }

    const exportContent = project.content || '';
    const docState = parseDocument(exportContent);

    if (docState.title === 'Untitled Document' && project.name && project.name !== 'Untitled Document') {
      docState.title = project.name;
    }

    const exportTitle =
      docState.title && docState.title !== 'Untitled Document'
        ? docState.title
        : project.name || 'Braid Document';

    const filename = sanitizeFilename(exportTitle, format as ExportFormat);
    const contentDisposition = getContentDispositionHeader(filename);

    let buffer: Buffer;
    let contentType: string;

    if (format === 'docx') {
      buffer = await generateDocx(docState);
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else {
      buffer = await generatePdf(docState);
      contentType = 'application/pdf';
    }

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': contentDisposition,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
