import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  parseDocument,
  serializeDocument,
  parseInlineFormatting,
} from '../lib/document-model';
import { RGA } from '../crdt-engine/src/rga';
import { SyncClient } from '../lib/sync-client';
import { SyncServer } from '../sync-server/server';
import { WebSocketServer, WebSocket as NodeWebSocket } from 'ws';

describe('Block Document Model & Parser', () => {
  it('parses all block types accurately from markdown sequence', () => {
    const rawMarkdown = [
      '# Document Title',
      '## Subtitle Heading',
      '### Minor Section',
      'This is a regular paragraph with **bold** text.',
      '- Bullet item 1',
      '- Bullet item 2',
      '1. Numbered step 1',
      '2. Numbered step 2',
      '- [ ] Unfinished task',
      '- [x] Completed task',
      '> Inspirational quote',
      '> 💡 Important callout note',
      '```typescript',
      'const x = 42;',
      'console.log(x);',
      '```',
      '---',
    ].join('\n');

    const doc = parseDocument(rawMarkdown);

    expect(doc.title).toBe('Document Title');
    expect(doc.blocks.length).toBe(14);

    expect(doc.blocks[0].type).toBe('heading1');
    expect(doc.blocks[0].content).toBe('Document Title');

    expect(doc.blocks[1].type).toBe('heading2');
    expect(doc.blocks[1].content).toBe('Subtitle Heading');

    expect(doc.blocks[2].type).toBe('heading3');
    expect(doc.blocks[2].content).toBe('Minor Section');

    expect(doc.blocks[3].type).toBe('paragraph');
    expect(doc.blocks[3].content).toBe('This is a regular paragraph with **bold** text.');

    expect(doc.blocks[4].type).toBe('bulleted_list');
    expect(doc.blocks[4].content).toBe('Bullet item 1');

    expect(doc.blocks[6].type).toBe('numbered_list');
    expect(doc.blocks[6].content).toBe('Numbered step 1');

    expect(doc.blocks[8].type).toBe('todo');
    expect(doc.blocks[8].checked).toBe(false);
    expect(doc.blocks[8].content).toBe('Unfinished task');

    expect(doc.blocks[9].type).toBe('todo');
    expect(doc.blocks[9].checked).toBe(true);
    expect(doc.blocks[9].content).toBe('Completed task');

    expect(doc.blocks[10].type).toBe('quote');
    expect(doc.blocks[10].content).toBe('Inspirational quote');

    expect(doc.blocks[11].type).toBe('callout');
    expect(doc.blocks[11].calloutVariant).toBe('important');
    expect(doc.blocks[11].content).toBe('Important callout note');

    expect(doc.blocks[12].type).toBe('code');
    expect(doc.blocks[12].codeLanguage).toBe('typescript');
    expect(doc.blocks[12].content).toBe('const x = 42;\nconsole.log(x);');

    expect(doc.blocks[13].type).toBe('divider');
  });

  it('serializes blocks back into deterministic markdown', () => {
    const blocks = [
      { id: '1', type: 'heading1' as const, content: 'Sprint Roadmap', rawLine: '', lineIndex: 0 },
      { id: '2', type: 'todo' as const, content: 'Build Block Editor', checked: true, rawLine: '', lineIndex: 1 },
      { id: '3', type: 'todo' as const, content: 'Write Tests', checked: false, rawLine: '', lineIndex: 2 },
      { id: '4', type: 'divider' as const, content: '', rawLine: '', lineIndex: 3 },
    ];

    const serialized = serializeDocument(blocks);
    expect(serialized).toBe('# Sprint Roadmap\n- [x] Build Block Editor\n- [ ] Write Tests\n---');

    const reParsed = parseDocument(serialized);
    expect(reParsed.blocks.length).toBe(4);
    expect(reParsed.blocks[1].checked).toBe(true);
    expect(reParsed.blocks[2].checked).toBe(false);
  });

  it('parses rich inline formatting tokens into styled spans', () => {
    const text = 'Hello **bold** and *italic* with <u>underlined</u> and ~~strike~~ plus `code` and [Docs](https://braid.dev)!';
    const spans = parseInlineFormatting(text);

    expect(spans.length).toBe(13);
    expect(spans[0]).toEqual({ text: 'Hello ' });
    expect(spans[1]).toEqual({ text: 'bold', bold: true });
    expect(spans[2]).toEqual({ text: ' and ' });
    expect(spans[3]).toEqual({ text: 'italic', italic: true });
    expect(spans[4]).toEqual({ text: ' with ' });
    expect(spans[5]).toEqual({ text: 'underlined', underline: true });
    expect(spans[6]).toEqual({ text: ' and ' });
    expect(spans[7]).toEqual({ text: 'strike', strikethrough: true });
    expect(spans[8]).toEqual({ text: ' plus ' });
    expect(spans[9]).toEqual({ text: 'code', code: true });
    expect(spans[10]).toEqual({ text: ' and ' });
    expect(spans[11]).toEqual({ text: 'Docs', link: 'https://braid.dev' });
    expect(spans[12]).toEqual({ text: '!' });
  });
});

describe('Collaborative Block Operations over RGA CRDT', () => {
  let wss: WebSocketServer;
  let syncServer: SyncServer;
  let port: number;
  let serverUrl: string;

  beforeAll(
    () =>
      new Promise<void>((resolve) => {
        syncServer = new SyncServer();
        wss = new WebSocketServer({ port: 0 }, () => {
          const addr = wss.address();
          if (typeof addr === 'object' && addr !== null) {
            port = addr.port;
            serverUrl = `ws://127.0.0.1:${port}`;
          }
          syncServer.attachWebSocketServer(wss);
          resolve();
        });
      })
  );

  afterAll(
    () =>
      new Promise<void>((resolve) => {
        for (const client of wss.clients) {
          client.terminate();
        }
        wss.close(() => resolve());
      })
  );

  it('synchronizes block creation, formatting, and todo state changes across replicas', async () => {
    const docId = 'block-sync-test';
    const rgaAlice = new RGA('site-alice');
    const rgaBob = new RGA('site-bob');

    const clientAlice = new SyncClient({
      serverUrl,
      docId,
      siteId: rgaAlice.siteId,
      name: 'Alice',
      WebSocketClass: NodeWebSocket,
      autoConnect: true,
      onRemoteOp: (op) => {
        clientAlice.applyRemoteOp(rgaAlice, op);
      },
    });

    const clientBob = new SyncClient({
      serverUrl,
      docId,
      siteId: rgaBob.siteId,
      name: 'Bob',
      WebSocketClass: NodeWebSocket,
      autoConnect: true,
      onRemoteOp: (op) => {
        clientBob.applyRemoteOp(rgaBob, op);
      },
    });

    await Promise.all([clientAlice.whenJoined(), clientBob.whenJoined()]);

    // 1. Alice creates structured block document
    const initialText = '# Product Plan\n- [ ] Ship Block Editor\n> 💡 High priority';
    let cursor: Parameters<RGA['localInsert']>[0] = null;
    for (const ch of initialText) {
      const op = rgaAlice.localInsert(cursor, ch);
      cursor = op.id;
      clientAlice.sendOperation(op);
    }

    await new Promise((r) => setTimeout(r, 60));

    expect(rgaBob.getText()).toBe(initialText);
    const bobDoc = parseDocument(rgaBob.getText());
    expect(bobDoc.blocks.length).toBe(3);
    expect(bobDoc.blocks[0].type).toBe('heading1');
    expect(bobDoc.blocks[1].type).toBe('todo');
    expect(bobDoc.blocks[1].checked).toBe(false);
    expect(bobDoc.blocks[2].type).toBe('callout');

    // 2. Bob toggles todo to checked (- [ ] -> - [x])
    // Replace ' ' inside '[ ]' with 'x'
    const spaceOffset = rgaBob.getText().indexOf('[ ') + 1;
    const spaceId = rgaBob.idAtVisibleOffset(spaceOffset + 1)!;
    const delOp = rgaBob.localDelete(spaceId);
    const insOp = rgaBob.localInsert(rgaBob.idAtVisibleOffset(spaceOffset), 'x');
    clientBob.sendOperation(delOp);
    clientBob.sendOperation(insOp);

    await new Promise((r) => setTimeout(r, 60));

    expect(rgaAlice.getText()).toContain('- [x] Ship Block Editor');
    const aliceDoc = parseDocument(rgaAlice.getText());
    expect(aliceDoc.blocks[1].checked).toBe(true);

    clientAlice.disconnect();
    clientBob.disconnect();
  });
});
