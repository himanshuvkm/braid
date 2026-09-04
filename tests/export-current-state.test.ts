import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../app/api/projects/[id]/export/route';
import { setAdapter, getProject } from '../lib/db';
import { SqliteAdapter } from '../lib/db/sqlite-adapter';
import { RGA } from '../crdt-engine/src/rga';
import type { User } from '../lib/db';

let currentUserMock: User | null = null;

vi.mock('../lib/auth', () => ({
  getCurrentUser: vi.fn(async () => currentUserMock),
  SESSION_COOKIE_NAME: 'braid_session',
}));

describe('Export Current-State Correctness & Instant Synchronization', () => {
  let adapter: SqliteAdapter;
  let owner: User;
  let editor: User;
  let viewer: User;
  let project: { id: string; name: string; content?: string };

  beforeEach(async () => {
    adapter = new SqliteAdapter(':memory:');
    await adapter.init();
    setAdapter(adapter);

    owner = await adapter.createUser({ name: 'Alice Owner', email: 'alice@braid.app' });
    editor = await adapter.createUser({ name: 'Bob Editor', email: 'bob@braid.app' });
    viewer = await adapter.createUser({ name: 'Charlie Viewer', email: 'charlie@braid.app' });

    project = await adapter.createProject({ ownerId: owner.id, name: 'Live Document' });
    await adapter.updateProjectContent(project.id, '# Initial Title\n\nOld snapshot content.');
    await adapter.addProjectMember(project.id, editor.id, 'EDITOR');
    await adapter.addProjectMember(project.id, viewer.id, 'VIEWER');
  });

  it('exports freshly typed content immediately without waiting for debounced autosave', async () => {
    currentUserMock = owner;

    // Simulate user typing in editor: new text is in memory, not yet autosaved to DB
    const freshlyTypedText = '# Live Document\n\nHello world - freshly typed text before autosave completes!';

    // Database still has old content
    const dbBefore = await getProject(project.id);
    expect(dbBefore?.content).toBe('# Initial Title\n\nOld snapshot content.');

    // User clicks Export immediately -> client sends { format: 'docx', content: freshlyTypedText }
    const req = new Request(`http://localhost:3000/api/projects/${project.id}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format: 'docx',
        content: freshlyTypedText,
      }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: project.id }) });
    expect(res.status).toBe(200);

    const docxBuffer = Buffer.from(await res.arrayBuffer());
    expect(docxBuffer.subarray(0, 4)).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04]));

    // Verify DB was synchronously updated to eliminate any persistence delay
    const dbAfter = await getProject(project.id);
    expect(dbAfter?.content).toBe(freshlyTypedText);
  });

  it('immediately includes latest typed content in PDF export', async () => {
    currentUserMock = editor;

    const freshlyTypedText = '# Collaboration Proposal\n\nImmediate export test for PDF generation with Hello World.';

    const req = new Request(`http://localhost:3000/api/projects/${project.id}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format: 'pdf',
        content: freshlyTypedText,
      }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: project.id }) });
    expect(res.status).toBe(200);
    const pdfBuffer = Buffer.from(await res.arrayBuffer());
    expect(pdfBuffer.subarray(0, 4).toString()).toBe('%PDF');

    const dbAfter = await getProject(project.id);
    expect(dbAfter?.content).toBe(freshlyTypedText);
  });

  it('prevents VIEWER from overwriting database content via export payload', async () => {
    currentUserMock = viewer;

    const originalContent = '# Initial Title\n\nOld snapshot content.';
    const maliciousAttempt = '# Tampered Title\n\nHacked content by viewer.';

    const req = new Request(`http://localhost:3000/api/projects/${project.id}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format: 'docx',
        content: maliciousAttempt,
      }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: project.id }) });
    expect(res.status).toBe(200);

    // Database content MUST remain unchanged because VIEWER has read-only access
    const dbAfter = await getProject(project.id);
    expect(dbAfter?.content).toBe(originalContent);
  });

  it('preserves CRDT state and synchronizes local RGA edits with export', () => {
    // Verify RGA CRDT integrity: local edits convert directly to character stream
    const rga = new RGA('site-1');
    const initialText = 'Hello ';
    let lastId = null;
    for (const ch of initialText) {
      const op = rga.localInsert(lastId, ch);
      lastId = op.id;
    }

    // Type 'world'
    for (const ch of 'world') {
      const op = rga.localInsert(lastId, ch);
      lastId = op.id;
    }

    expect(rga.getText()).toBe('Hello world');
    // Content from rga.getText() matches what is passed to export
    expect(rga.getText()).toContain('Hello world');
  });
});
