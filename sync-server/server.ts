import type { WebSocketServer, WebSocket } from 'ws';
import type { Op } from '../crdt-engine/src/index';

export interface PeerInfo {
  siteId: string;
  name?: string;
  color?: string;
  cursor?: number;
}

export type SyncMessage =
  | { type: 'join'; docId: string; siteId: string; name?: string; color?: string }
  | { type: 'leave'; docId: string; siteId: string }
  | { type: 'op'; docId: string; siteId: string; op: Op }
  | { type: 'sync'; docId: string; history: Op[]; peers: PeerInfo[] }
  | {
      type: 'presence';
      docId: string;
      siteId: string;
      name?: string;
      color?: string;
      cursor?: number;
      action?: 'join' | 'leave' | 'update';
    }
  | { type: 'peers'; docId: string; peers: PeerInfo[] }
  | { type: 'ack'; docId: string; siteId: string; counter: number }
  | { type: 'stable_counters'; docId: string; stableCounters: Record<string, number> };

export interface ClientConnection {
  id: string;
  siteId?: string;
  docId?: string;
  name?: string;
  color?: string;
  cursor?: number;
  send: (data: string) => void;
  close?: () => void;
}

/**
 * SyncServer acts as a lightweight, CRDT-agnostic relay and room router.
 * It does not need to understand RGA merge logic: it simply buffers doc history
 * and broadcasts ops/presence to other clients in the same document room.
 */
export class SyncServer {
  private rooms: Map<string, Set<ClientConnection>> = new Map();
  private docHistory: Map<string, Op[]> = new Map();
  private siteClocks: Map<string, Map<string, number>> = new Map(); // docId -> (siteId -> highest counter)

  /**
   * Handle incoming raw message from a client
   */
  handleMessage(client: ClientConnection, raw: string): void {
    let msg: SyncMessage;
    try {
      msg = JSON.parse(raw);
    } catch {
      console.error('[SyncServer] Invalid JSON received:', raw);
      return;
    }

    switch (msg.type) {
      case 'join':
        this.joinRoom(msg.docId, client, {
          siteId: msg.siteId,
          name: msg.name,
          color: msg.color,
        });
        break;

      case 'op':
        if (msg.op && msg.docId) {
          if (!client.docId || client.docId !== msg.docId) {
            this.joinRoom(msg.docId, client, { siteId: msg.siteId || msg.op.id.siteId });
          }
          this.handleOperation(client, msg.docId, msg.op);
        }
        break;

      case 'presence':
        if (msg.docId) {
          if (!client.docId) {
            this.joinRoom(msg.docId, client, { siteId: msg.siteId });
          }
          this.handlePresence(client, msg.docId, msg);
        }
        break;

      case 'ack':
        if (msg.docId && msg.siteId && typeof msg.counter === 'number') {
          this.handleAck(msg.docId, msg.siteId, msg.counter);
        }
        break;

      case 'leave':
        this.handleDisconnect(client);
        break;

      default:
        break;
    }
  }

  /**
   * Join a document room, send history, and announce to peers
   */
  joinRoom(docId: string, client: ClientConnection, info?: Partial<PeerInfo>): void {
    if (client.docId && client.docId !== docId) {
      this.handleDisconnect(client);
    }

    client.docId = docId;
    if (info?.siteId) client.siteId = info.siteId;
    if (info?.name) client.name = info.name;
    if (info?.color) client.color = info.color;

    if (!this.rooms.has(docId)) {
      this.rooms.set(docId, new Set());
      this.docHistory.set(docId, []);
      this.siteClocks.set(docId, new Map());
    }

    const room = this.rooms.get(docId)!;
    room.add(client);

    // 1. Send initial sync catch-up with history and existing peers
    const history = this.docHistory.get(docId) || [];
    const peers = this.getPeers(docId);

    const syncMsg: SyncMessage = {
      type: 'sync',
      docId,
      history,
      peers,
    };
    client.send(JSON.stringify(syncMsg));

    // 2. Announce new peer presence to other room members
    if (client.siteId) {
      this.broadcast(
        docId,
        {
          type: 'presence',
          docId,
          siteId: client.siteId,
          name: client.name,
          color: client.color,
          cursor: client.cursor,
          action: 'join',
        },
        client.id
      );
    }
  }

  /**
   * Append op to document history and relay to other peers
   */
  handleOperation(client: ClientConnection, docId: string, op: Op): void {
    const history = this.docHistory.get(docId);
    if (history) {
      history.push(op);
    }

    // Track clock for GC stability
    const siteId = op.id.siteId;
    const clocks = this.siteClocks.get(docId);
    if (clocks) {
      const current = clocks.get(siteId) ?? 0;
      if (op.id.counter > current) {
        clocks.set(siteId, op.id.counter);
      }
    }

    // Relay to other clients in room
    this.broadcast(
      docId,
      {
        type: 'op',
        docId,
        siteId: client.siteId || op.id.siteId,
        op,
      },
      client.id
    );
  }

  /**
   * Handle cursor or metadata presence update
   */
  handlePresence(
    client: ClientConnection,
    docId: string,
    msg: { siteId: string; name?: string; color?: string; cursor?: number }
  ): void {
    if (msg.name !== undefined) client.name = msg.name;
    if (msg.color !== undefined) client.color = msg.color;
    if (msg.cursor !== undefined) client.cursor = msg.cursor;

    this.broadcast(
      docId,
      {
        type: 'presence',
        docId,
        siteId: client.siteId || msg.siteId,
        name: client.name,
        color: client.color,
        cursor: client.cursor,
        action: 'update',
      },
      client.id
    );
  }

  /**
   * Track client acks for tombstone GC stability
   */
  handleAck(docId: string, siteId: string, counter: number): void {
    const clocks = this.siteClocks.get(docId);
    if (!clocks) return;

    const current = clocks.get(siteId) ?? 0;
    if (counter > current) {
      clocks.set(siteId, counter);
    }
  }

  /**
   * Broadcast a message to all clients in a room except optional sender
   */
  broadcast(docId: string, message: SyncMessage, excludeClientId?: string): void {
    const room = this.rooms.get(docId);
    if (!room) return;

    const data = JSON.stringify(message);
    for (const client of room) {
      if (client.id !== excludeClientId) {
        client.send(data);
      }
    }
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: ClientConnection): void {
    if (client.docId && this.rooms.has(client.docId)) {
      const docId = client.docId;
      const room = this.rooms.get(docId)!;
      room.delete(client);

      if (client.siteId) {
        this.broadcast(docId, {
          type: 'presence',
          docId,
          siteId: client.siteId,
          action: 'leave',
        });
      }

      if (room.size === 0) {
        // Keep docHistory in memory for future reconnects / late joiners
        this.rooms.delete(docId);
      }
    }
    client.docId = undefined;
  }

  /**
   * Get active peer metadata for a document room
   */
  getPeers(docId: string): PeerInfo[] {
    const room = this.rooms.get(docId);
    if (!room) return [];

    const peers: PeerInfo[] = [];
    for (const client of room) {
      if (client.siteId) {
        peers.push({
          siteId: client.siteId,
          name: client.name,
          color: client.color,
          cursor: client.cursor,
        });
      }
    }
    return peers;
  }

  /**
   * Get history for a document
   */
  getHistory(docId: string): readonly Op[] {
    return this.docHistory.get(docId) ?? [];
  }

  /**
   * Clear all rooms and history (useful for tests)
   */
  reset(): void {
    this.rooms.clear();
    this.docHistory.clear();
    this.siteClocks.clear();
  }

  /**
   * Bind to a Node.js WebSocketServer instance
   */
  attachWebSocketServer(wss: WebSocketServer): void {
    let clientCounter = 0;

    wss.on('connection', (ws: WebSocket) => {
      const clientId = `conn-${++clientCounter}-${Date.now().toString(36)}`;
      const client: ClientConnection = {
        id: clientId,
        send: (data: string) => {
          if (ws.readyState === ws.OPEN) {
            ws.send(data);
          }
        },
        close: () => ws.close(),
      };

      ws.on('message', (data: Buffer | string) => {
        const text = typeof data === 'string' ? data : data.toString('utf-8');
        this.handleMessage(client, text);
      });

      ws.on('close', () => {
        this.handleDisconnect(client);
      });

      ws.on('error', (err) => {
        console.error(`[SyncServer] WebSocket error on client ${clientId}:`, err);
        this.handleDisconnect(client);
      });
    });
  }
}

export default SyncServer;
