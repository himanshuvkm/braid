import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WebSocketServer, WebSocket as NodeWebSocket } from 'ws';
import { RGA } from '../crdt-engine/src/rga';
import type { Op } from '../crdt-engine/src/op';
import { SyncServer } from '../sync-server/server';
import { SyncClient, CausalBuffer, type WebSocketConstructor } from '../lib/sync-client';

describe('CausalBuffer: Out-of-order Remote Op Handling', () => {
  it('buffers dependent insert when parent has not yet arrived, and resolves upon arrival', () => {
    const author = new RGA('author');
    const op1 = author.localInsert(null, 'A');
    const op2 = author.localInsert(op1.id, 'B'); // depends on op1
    const op3 = author.localInsert(op2.id, 'C'); // depends on op2

    const replica = new RGA('replica');
    const buffer = new CausalBuffer();

    // Deliver in reversed order: op3, then op2, then op1
    expect(buffer.tryApply(replica, op3)).toBe(false); // op2 missing
    expect(buffer.size).toBe(1);
    expect(replica.getText()).toBe('');

    expect(buffer.tryApply(replica, op2)).toBe(false); // op1 missing
    expect(buffer.size).toBe(2);
    expect(replica.getText()).toBe('');

    // Now deliver root op1
    expect(buffer.tryApply(replica, op1)).toBe(true);
    expect(replica.getText()).toBe('A');

    // Flush buffer
    const flushed = buffer.flush(replica);
    expect(flushed.length).toBe(2); // op2 and op3 integrated
    expect(buffer.size).toBe(0);
    expect(replica.getText()).toBe('ABC');
  });

  it('buffers delete when target insert has not yet arrived', () => {
    const author = new RGA('author');
    const ins = author.localInsert(null, 'X');
    const del = author.localDelete(ins.id);

    const replica = new RGA('replica');
    const buffer = new CausalBuffer();

    // Delete arrives first
    expect(buffer.tryApply(replica, del)).toBe(false);
    expect(buffer.size).toBe(1);

    // Insert arrives
    expect(buffer.tryApply(replica, ins)).toBe(true);
    expect(replica.getText()).toBe('X');

    // Flush buffer applies the delete
    const flushed = buffer.flush(replica);
    expect(flushed.length).toBe(1);
    expect(replica.getText()).toBe('');
  });

  it('applyBatch handles completely scrambled stream of operations', () => {
    const author = new RGA('author');
    const ops: Op[] = [];
    let cursor: Parameters<RGA['localInsert']>[0] = null;
    for (const ch of 'Distributed CRDT Sync') {
      const op = author.localInsert(cursor, ch);
      ops.push(op);
      cursor = op.id;
    }

    const expectedText = author.getText();

    // Reverse the entire op stream
    const reversed = [...ops].reverse();

    const replica = new RGA('replica');
    const buffer = new CausalBuffer();

    const applied = buffer.applyBatch(replica, reversed);
    expect(applied.length).toBe(ops.length);
    expect(buffer.size).toBe(0);
    expect(replica.getText()).toBe(expectedText);
  });

  it('re-throws unexpected non-causal errors immediately instead of swallowing them as causal waits', () => {
    const buffer = new CausalBuffer();

    // Create an invalid/corrupted op structure that throws an arbitrary error
    const corruptedOp = {
      type: 'invalid_type',
      id: { counter: 1, siteId: 'corrupt' },
    } as unknown as Op;

    // If applyRemote throws something unexpected (or if replica throws TypeError), it must be thrown immediately
    const mockRgaThrowing = {
      applyRemote: () => {
        throw new TypeError('Unexpected memory fault or malformed payload');
      },
    } as unknown as RGA;

    expect(() => buffer.tryApply(mockRgaThrowing, corruptedOp)).toThrow(
      'Unexpected memory fault or malformed payload'
    );
    expect(buffer.size).toBe(0); // must not buffer non-causal errors
  });

  it('bounds memory by evicting oldest op when maxBufferSize is exceeded', () => {
    const replica = new RGA('replica');
    let droppedOp: Op | null = null;

    const buffer = new CausalBuffer({
      maxBufferSize: 3,
      onOverflow: (op) => {
        droppedOp = op;
      },
    });

    // Feed 4 unresolvable ops
    const op1: Op = {
      type: 'insert',
      id: { counter: 1, siteId: 'site-a' },
      originId: { counter: 99, siteId: 'unknown' },
      value: '1',
    };
    const op2: Op = {
      type: 'insert',
      id: { counter: 2, siteId: 'site-a' },
      originId: { counter: 99, siteId: 'unknown' },
      value: '2',
    };
    const op3: Op = {
      type: 'insert',
      id: { counter: 3, siteId: 'site-a' },
      originId: { counter: 99, siteId: 'unknown' },
      value: '3',
    };
    const op4: Op = {
      type: 'insert',
      id: { counter: 4, siteId: 'site-a' },
      originId: { counter: 99, siteId: 'unknown' },
      value: '4',
    };

    buffer.tryApply(replica, op1);
    buffer.tryApply(replica, op2);
    buffer.tryApply(replica, op3);
    expect(buffer.size).toBe(3);

    // Adding 4th op triggers eviction of op1
    buffer.tryApply(replica, op4);
    expect(buffer.size).toBe(3);
    expect(droppedOp).toEqual(op1);
  });

  it('tracks diagnostics, retry counts, stuck op alerts, and TTL pruning', () => {
    const replica = new RGA('replica');
    let stuckReported = false;

    const buffer = new CausalBuffer({
      maxBufferSize: 10,
      warnRetryThreshold: 2,
      maxTtlMs: 50,
      onStuckOp: () => {
        stuckReported = true;
      },
    });

    const stuckOp: Op = {
      type: 'insert',
      id: { counter: 10, siteId: 'site-z' },
      originId: { counter: 999, siteId: 'missing' },
      value: 'Z',
    };

    buffer.tryApply(replica, stuckOp);

    // Initial diagnostics
    const initialDiag = buffer.getDiagnostics();
    expect(initialDiag.size).toBe(1);
    expect(initialDiag.entries[0].dependency).toContain('origin 999:missing');

    // Flush twice: retryCount reaches warnRetryThreshold (2)
    buffer.flush(replica);
    buffer.flush(replica);

    expect(stuckReported).toBe(true);
    expect(buffer.getDiagnostics().maxRetries).toBe(2);

    // Test TTL prune: wait 60ms and prune
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const pruned = buffer.prune(50);
        expect(pruned.length).toBe(1);
        expect(buffer.size).toBe(0);
        resolve();
      }, 60);
    });
  });
});

describe('SyncServer and SyncClient Integration over WebSockets', () => {
  let wss: WebSocketServer;
  let server: SyncServer;
  let port: number;
  let serverUrl: string;

  beforeAll(
    () =>
      new Promise<void>((resolve) => {
        server = new SyncServer();
        // Bind to port 0 for an available dynamic OS port
        wss = new WebSocketServer({ port: 0 }, () => {
          const addr = wss.address();
          if (typeof addr === 'object' && addr !== null) {
            port = addr.port;
            serverUrl = `ws://127.0.0.1:${port}`;
          }
          server.attachWebSocketServer(wss);
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

  it('two live clients converge when editing concurrently over WebSocket', async () => {
    const docId = 'test-doc-convergence';

    const rgaA = new RGA('site-alpha');
    const rgaB = new RGA('site-beta');

    const clientA = new SyncClient({
      serverUrl,
      docId,
      siteId: rgaA.siteId,
      WebSocketClass: NodeWebSocket,
      autoConnect: true,
      onRemoteOp: (op) => {
        clientA.applyRemoteOp(rgaA, op);
      },
    });

    const clientB = new SyncClient({
      serverUrl,
      docId,
      siteId: rgaB.siteId,
      WebSocketClass: NodeWebSocket,
      autoConnect: true,
      onRemoteOp: (op) => {
        clientB.applyRemoteOp(rgaB, op);
      },
    });

    // Wait until both clients have fully joined the room on the server
    await Promise.all([clientA.whenJoined(), clientB.whenJoined()]);

    // Both sites generate edits concurrently
    const opA1 = rgaA.localInsert(null, 'H');
    const opA2 = rgaA.localInsert(opA1.id, 'i');
    clientA.sendOperation(opA1);
    clientA.sendOperation(opA2);

    const opB1 = rgaB.localInsert(null, '!');
    clientB.sendOperation(opB1);

    // Wait briefly for network relay
    await new Promise((r) => setTimeout(r, 100));

    // Both clients must converge to the exact same text
    expect(rgaA.getText()).toBe(rgaB.getText());
    expect(rgaA.getText().length).toBe(3);

    clientA.disconnect();
    clientB.disconnect();
  });

  it('late joiner receives full history and converges to existing document state', async () => {
    const docId = 'test-doc-late-join';

    const rgaA = new RGA('site-author');
    const clientA = new SyncClient({
      serverUrl,
      docId,
      siteId: rgaA.siteId,
      WebSocketClass: NodeWebSocket,
      autoConnect: true,
    });

    await clientA.whenJoined();

    // Author types "Braid CRDT"
    let cursor: Parameters<RGA['localInsert']>[0] = null;
    for (const ch of 'Braid CRDT') {
      const op = rgaA.localInsert(cursor, ch);
      clientA.sendOperation(op);
      cursor = op.id;
    }

    // Wait for server to receive ops
    await new Promise((r) => setTimeout(r, 50));

    // Late joining client connects
    const rgaLate = new RGA('site-late');
    let lateClient: SyncClient;

    await new Promise<void>((resolve) => {
      lateClient = new SyncClient({
        serverUrl,
        docId,
        siteId: rgaLate.siteId,
        WebSocketClass: NodeWebSocket,
        autoConnect: true,
        onSyncComplete: (history) => {
          lateClient.applyHistory(rgaLate, history);
          resolve();
        },
      });
    });

    // Late joiner text matches author text exactly
    expect(rgaLate.getText()).toBe(rgaA.getText());
    expect(rgaLate.getText()).toBe('Braid CRDT');

    clientA.disconnect();
    lateClient!.disconnect();
  });

  it('offline edits are queued and broadcast upon connection', async () => {
    const docId = 'test-doc-offline-queue';

    const rgaOffline = new RGA('site-offline');
    const clientOffline = new SyncClient({
      serverUrl,
      docId,
      siteId: rgaOffline.siteId,
      WebSocketClass: NodeWebSocket,
      autoConnect: false, // Not connected yet
    });

    // Perform edits while offline
    const op1 = rgaOffline.localInsert(null, 'O');
    const op2 = rgaOffline.localInsert(op1.id, 'f');
    const op3 = rgaOffline.localInsert(op2.id, 'f');
    clientOffline.sendOperation(op1);
    clientOffline.sendOperation(op2);
    clientOffline.sendOperation(op3);

    expect(clientOffline.pendingOutgoingCount).toBe(3);

    // Connect to server
    clientOffline.connect();
    await clientOffline.whenJoined();

    // Wait for queue flush and server relay
    await new Promise((r) => setTimeout(r, 80));

    // Connect a second client to check if offline ops reached the room
    const rgaObserver = new RGA('site-observer');
    let observerClient: SyncClient;

    await new Promise<void>((resolve) => {
      observerClient = new SyncClient({
        serverUrl,
        docId,
        siteId: rgaObserver.siteId,
        WebSocketClass: NodeWebSocket,
        autoConnect: true,
        onSyncComplete: (history) => {
          observerClient.applyHistory(rgaObserver, history);
          resolve();
        },
      });
    });

    expect(rgaObserver.getText()).toBe('Off');
    expect(rgaObserver.getText()).toBe(rgaOffline.getText());

    clientOffline.disconnect();
    observerClient!.disconnect();
  });

  it('grows reconnect delay by 1.5x on failed connection attempts up to maxReconnectIntervalMs', async () => {
    const unreachableUrl = 'ws://127.0.0.1:59998';
    const client = new SyncClient({
      serverUrl: unreachableUrl,
      docId: 'backoff-test-doc',
      siteId: 'site-backoff',
      WebSocketClass: NodeWebSocket,
      autoConnect: false,
      reconnectIntervalMs: 50,
      maxReconnectIntervalMs: 150,
    });

    expect(client.reconnectDelay).toBe(50);

    // Initial connection attempt
    client.connect();

    // Give time for WebSocket to fail and schedule reconnect
    await new Promise((r) => setTimeout(r, 20));
    expect(client.reconnectDelay).toBe(75); // 50 * 1.5

    // Wait for the 50ms reconnect timer to fire and fail again
    await new Promise((r) => setTimeout(r, 60));
    expect(client.reconnectDelay).toBe(112.5); // 75 * 1.5

    // Wait for the 75ms reconnect timer to fire and fail again
    await new Promise((r) => setTimeout(r, 90));
    expect(client.reconnectDelay).toBe(150); // 112.5 * 1.5 = 168.75 capped to 150

    client.disconnect();
    expect(client.reconnectDelay).toBe(50); // reset on disconnect
  });

  it('resets reconnect delay back to initial value when connection succeeds', async () => {
    const client = new SyncClient({
      serverUrl,
      docId: 'reconnect-reset-test',
      siteId: 'site-reset',
      WebSocketClass: NodeWebSocket,
      autoConnect: true,
      reconnectIntervalMs: 100,
      maxReconnectIntervalMs: 800,
    });

    await client.whenJoined();
    expect(client.isConnected).toBe(true);
    expect(client.reconnectDelay).toBe(100);

    client.disconnect();
    expect(client.isConnected).toBe(false);
    expect(client.reconnectDelay).toBe(100);
  });

  it('guarantees at most one pending reconnect timer even when onerror and onclose both fire', async () => {
    let connectAttempts = 0;

    class MockFailingWebSocket {
      readyState = 0;
      onopen: ((ev: unknown) => void) | null = null;
      onmessage: ((ev: { data: unknown }) => void) | null = null;
      onclose: ((ev: unknown) => void) | null = null;
      onerror: ((ev: unknown) => void) | null = null;

      constructor() {
        connectAttempts++;
        // Simulate immediate error and close callback
        queueMicrotask(() => {
          this.onerror?.(new Error('simulated connection error'));
          this.onclose?.({ code: 1006, reason: 'Abnormal Closure' });
        });
      }

      send() {}
      close() {}
    }

    const client = new SyncClient({
      serverUrl: 'ws://mock-fail',
      docId: 'single-timer-test',
      siteId: 'site-single-timer',
      WebSocketClass: MockFailingWebSocket as unknown as WebSocketConstructor,
      autoConnect: false,
      reconnectIntervalMs: 40,
      maxReconnectIntervalMs: 200,
    });

    client.connect();
    expect(connectAttempts).toBe(1);

    // Wait for microtask (error + close) to fire and schedule reconnect
    await new Promise((r) => setTimeout(r, 10));
    expect(client.reconnectDelay).toBe(60); // 40 * 1.5

    // Wait past the 40ms timer -> exactly one reconnect attempt should occur (total 2)
    await new Promise((r) => setTimeout(r, 50));
    expect(connectAttempts).toBe(2);
    expect(client.reconnectDelay).toBe(90); // 60 * 1.5

    client.disconnect();
  });

  it('handles synchronous constructor throw without creating duplicate reconnect timers', async () => {
    let connectAttempts = 0;

    class MockThrowingWebSocket {
      readyState = 0;
      onopen = null;
      onmessage = null;
      onclose = null;
      onerror = null;

      constructor() {
        connectAttempts++;
        throw new Error('Synchronous socket creation failure');
      }

      send() {}
      close() {}
    }

    const client = new SyncClient({
      serverUrl: 'ws://mock-throw',
      docId: 'throw-test',
      siteId: 'site-throw',
      WebSocketClass: MockThrowingWebSocket as unknown as WebSocketConstructor,
      autoConnect: false,
      reconnectIntervalMs: 30,
      maxReconnectIntervalMs: 120,
    });

    client.connect();
    expect(connectAttempts).toBe(1);
    expect(client.reconnectDelay).toBe(45); // 30 * 1.5

    // Wait for the 30ms timer to fire
    await new Promise((r) => setTimeout(r, 45));
    expect(connectAttempts).toBe(2);
    expect(client.reconnectDelay).toBe(67.5); // 45 * 1.5

    client.disconnect();
  });

  it('disconnect() cancels pending reconnect timer and prevents future reconnects', async () => {
    let connectAttempts = 0;

    class MockManualCloseWebSocket {
      readyState = 0;
      onopen = null;
      onmessage = null;
      onclose: ((ev: unknown) => void) | null = null;
      onerror: ((ev: unknown) => void) | null = null;

      constructor() {
        connectAttempts++;
        queueMicrotask(() => {
          this.onclose?.({});
        });
      }

      send() {}
      close() {
        // Trigger onclose on disconnect
        this.onclose?.({});
      }
    }

    const client = new SyncClient({
      serverUrl: 'ws://mock-disconnect',
      docId: 'cancel-test',
      siteId: 'site-cancel',
      WebSocketClass: MockManualCloseWebSocket as unknown as WebSocketConstructor,
      autoConnect: false,
      reconnectIntervalMs: 50,
      maxReconnectIntervalMs: 200,
    });

    client.connect();
    expect(connectAttempts).toBe(1);

    // Allow onclose to schedule reconnect
    await new Promise((r) => setTimeout(r, 10));
    expect(client.reconnectDelay).toBe(75);

    // Call disconnect() before the 50ms timer fires
    client.disconnect();
    expect(client.reconnectDelay).toBe(50); // reset

    // Wait 100ms and verify NO additional connect attempts were made
    await new Promise((r) => setTimeout(r, 100));
    expect(connectAttempts).toBe(1);
  });
});
