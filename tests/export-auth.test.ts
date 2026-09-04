import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET } from '../app/api/projects/[id]/export/route';
import { setAdapter } from '../lib/db';
import { SqliteAdapter } from '../lib/db/sqlite-adapter';
import type { User } from '../lib/db';

let currentUserMock: User | null = null;

vi.mock('../lib/auth', () => ({
  getCurrentUser: vi.fn(async () => currentUserMock),
  SESSION_COOKIE_NAME: 'braid_session',
}));

describe('Export API Authorization & Validation (/api/projects/[id]/export)', () => {
  let adapter: SqliteAdapter;
  let owner: User;
  let editor: User;
  let viewer: User;
  let stranger: User;
  let project: { id: string; name: string; content?: string };

  beforeEach(async () => {
    adapter = new SqliteAdapter(':memory:');
    await adapter.init();
    setAdapter(adapter);

    owner = await adapter.createUser({ name: 'Alice Owner', email: 'alice@braid.app' });
    editor = await adapter.createUser({ name: 'Bob Editor', email: 'bob@braid.app' });
    viewer = await adapter.createUser({ name: 'Charlie Viewer', email: 'charlie@braid.app' });
    stranger = await adapter.createUser({ name: 'Eve Stranger', email: 'eve@braid.app' });

    project = await adapter.createProject({ ownerId: owner.id, name: 'Quarterly Roadmap' });
    await adapter.updateProjectContent(
      project.id,
      '# Quarterly Roadmap\n\nPhase 1 deliverables and goals.\n\n- [x] Launch DOCX export\n- [ ] Launch PDF export'
    );

    await adapter.addProjectMember(project.id, editor.id, 'EDITOR');
    await adapter.addProjectMember(project.id, viewer.id, 'VIEWER');
  });

  it('rejects unauthenticated export with HTTP 401', async () => {
    currentUserMock = null;

    const req = new Request(`http://localhost:3000/api/projects/${project.id}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format: 'docx' }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: project.id }) });
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns HTTP 404 for a non-existent project', async () => {
    currentUserMock = owner;

    const req = new Request('http://localhost:3000/api/projects/proj-missing/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format: 'docx' }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: 'proj-missing' }) });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe('Project not found');
  });

  it('rejects a user without project membership with HTTP 403', async () => {
    currentUserMock = stranger;

    const req = new Request(`http://localhost:3000/api/projects/${project.id}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format: 'docx' }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: project.id }) });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe('Forbidden');
  });

  it('rejects invalid export formats with HTTP 400', async () => {
    currentUserMock = owner;

    const req = new Request(`http://localhost:3000/api/projects/${project.id}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format: 'exe' }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: project.id }) });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Invalid export format');
  });

  it('allows project OWNER to export DOCX and PDF with proper headers', async () => {
    currentUserMock = owner;

    // DOCX
    const docxReq = new Request(`http://localhost:3000/api/projects/${project.id}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format: 'docx' }),
    });
    const docxRes = await POST(docxReq, { params: Promise.resolve({ id: project.id }) });
    expect(docxRes.status).toBe(200);
    expect(docxRes.headers.get('Content-Type')).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    expect(docxRes.headers.get('Content-Disposition')).toContain('Quarterly Roadmap.docx');

    const docxBuffer = Buffer.from(await docxRes.arrayBuffer());
    expect(docxBuffer.subarray(0, 4)).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04])); // OpenXML ZIP magic

    // PDF
    const pdfReq = new Request(`http://localhost:3000/api/projects/${project.id}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format: 'pdf' }),
    });
    const pdfRes = await POST(pdfReq, { params: Promise.resolve({ id: project.id }) });
    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers.get('Content-Type')).toBe('application/pdf');
    expect(pdfRes.headers.get('Content-Disposition')).toContain('Quarterly Roadmap.pdf');

    const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
    expect(pdfBuffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('allows project EDITOR to export document', async () => {
    currentUserMock = editor;

    const req = new Request(`http://localhost:3000/api/projects/${project.id}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format: 'pdf' }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: project.id }) });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
  });

  it('allows project VIEWER to export document in read-only mode', async () => {
    currentUserMock = viewer;

    const req = new Request(`http://localhost:3000/api/projects/${project.id}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format: 'docx' }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: project.id }) });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
  });

  it('supports GET /api/projects/[id]/export?format=docx and format=pdf', async () => {
    currentUserMock = owner;

    const req = new Request(
      `http://localhost:3000/api/projects/${project.id}/export?format=docx`,
      { method: 'GET' }
    );
    const res = await GET(req, { params: Promise.resolve({ id: project.id }) });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
  });
});
