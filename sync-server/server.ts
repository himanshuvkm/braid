import type { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'node:http';
import { RGA, type Op } from '../crdt-engine/src/index';
import { getProject, getProjectRole, getSession, updateProjectContent, type ProjectRole } from '../lib/db';
import { SESSION_COOKIE_NAME } from '../lib/auth';
import { verifyWebSocketToken } from '../lib/ws-token';

export interface PeerInfo {
  siteId: string;
  name?: string;
  color?: string;
  cursor?: number;
  role?: ProjectRole;
}

export type SyncMessage =
  | { type: 'join'; docId: string; siteId: string; name?: string; color?: string; userId?: string; sessionId?: string; token?: string }
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
      role?: ProjectRole;
      action?: 'join' | 'leave' | 'update';
    }
  | { type: 'peers'; docId: string; peers: PeerInfo[] }
  | { type: 'ack'; docId: string; siteId: string; counter: number }
  | { type: 'stable_counters'; docId: string; stableCounters: Record<string, number> }
  | { type: 'error'; docId?: string; error: string; code?: number };

export interface ClientConnection {
  id: string;
  siteId?: string;
  docId?: string;
  userId?: string;
  authenticatedUserId?: string;
  sessionId?: string;
  name?: string;
  color?: string;
  cursor?: number;
  role?: ProjectRole;
  isReadOnly?: boolean;
  send: (data: string) => void;
  close?: (code?: number, reason?: string) => void;
}

export interface AuthResult {
  allowed: boolean;
  role?: ProjectRole;
  readOnly?: boolean;
  userId?: string;
  error?: string;
  code?: number;
}

export type AuthorizerFn = (params: {
  docId: string;
  authenticatedUserId?: string;
  userId?: string;
  sessionId?: string;
  siteId: string;
}) => AuthResult | Promise<AuthResult>;

/**
 * Generate deterministic baseline insert ops for pre-existing document text
 */
export function textToBaselineOps(text: string, baselineSiteId: string = 'init'): Op[] {
  const rga = new RGA(baselineSiteId);
  const ops: Op[] = [];
  let cursor: Parameters<RGA['localInsert']>[0] = null;
  for (const ch of text) {
    const op = rga.localInsert(cursor, ch);
    cursor = op.id;
    ops.push(op);
  }
  return ops;
}

export interface ExtractedCredentials {
  token?: string;
  sessionId?: string;
}

/**
 * Extract auth credentials (token and/or session ID) from HTTP Cookie header or URL query string
 */
export function extractAuthCredentials(cookieHeader?: string, urlString?: string): ExtractedCredentials {
  let token: string | undefined;
  let sessionId: string | undefined;

  if (cookieHeader) {
    const match = cookieHeader.match(new RegExp(`(?:^|; )${SESSION_COOKIE_NAME}=([^;]*)`));
    if (match && match[1]) {
      sessionId = decodeURIComponent(match[1]);
    }
  }

  if (urlString) {
    try {
      const url = new URL(urlString, 'http://localhost');
      const tokenParam = url.searchParams.get('token');
      const sessionParam = url.searchParams.get('sessionId');
      if (tokenParam) token = tokenParam;
      if (sessionParam) sessionId = sessionParam;
    } catch {}
  }

  return { token, sessionId };
}

/**
 * Parse session ID from HTTP Cookie header or URL query string (retained for backward compatibility)
 */
export function extractSessionId(cookieHeader?: string, urlString?: string): string | undefined {
  const creds = extractAuthCredentials(cookieHeader, urlString);
  return creds.sessionId || creds.token;
}

/**
 * Validate either a cryptographically signed WebSocket token or database session ID.
 * Returns verified user identity if valid, or null.
 */
export async function authenticateCredentials(credentials: {
  token?: string;
  sessionId?: string;
}): Promise<{ userId: string; sessionId: string; userName: string } | null> {
  const { token, sessionId } = credentials;

  // 1. If signed token provided, cryptographically verify
  if (token) {
    const verified = verifyWebSocketToken(token);
    if (verified.valid && verified.payload) {
      try {
        const session = await getSession(verified.payload.sessionId);
        if (session && session.user.id === verified.payload.userId) {
          return {
            userId: session.user.id,
            sessionId: session.id,
            userName: session.user.name,
          };
        }
      } catch {}
      return {
        userId: verified.payload.userId,
        sessionId: verified.payload.sessionId,
        userName: 'Collaborator',
      };
    }
  }

  // 2. If raw sessionId provided (same-origin cookies or legacy tests)
  if (sessionId) {
    // If sessionId is formatted like a signed token (payload.signature)
    if (sessionId.includes('.')) {
      const verified = verifyWebSocketToken(sessionId);
      if (verified.valid && verified.payload) {
        try {
          const session = await getSession(verified.payload.sessionId);
          if (session && session.user.id === verified.payload.userId) {
            return {
              userId: session.user.id,
              sessionId: session.id,
              userName: session.user.name,
            };
          }
        } catch {}
        return {
          userId: verified.payload.userId,
          sessionId: verified.payload.sessionId,
          userName: 'Collaborator',
        };
      }
    }

    try {
      const session = await getSession(sessionId);
      if (session) {
        return {
          userId: session.user.id,
          sessionId: session.id,
          userName: session.user.name,
        };
      }
    } catch {}
  }

  return null;
}

/**
 * Default production authorizer:
 * URL-based access: anyone with the URL / unique code can view and edit the document in real time.
 */
export async function defaultAuthorizer(params: {
  docId: string;
  authenticatedUserId?: string;
  userId?: string;
  sessionId?: string;
}): Promise<AuthResult> {
  const userId = params.authenticatedUserId || params.userId || 'collaborator';
  let role: ProjectRole = 'OWNER';
  let readOnly = false;

  if (userId && userId !== 'collaborator') {
    try {
      const dbRole = await getProjectRole(params.docId, userId);
      if (dbRole) {
        role = dbRole;
        readOnly = dbRole === 'VIEWER';
      }
    } catch {}
  }

  return {
    allowed: true,
    role,
    readOnly,
    userId,
  };
}

/**
 * SyncServer acts as a lightweight, CRDT relay, room router, and production authorization gate.
 */
export class SyncServer {
  private rooms: Map<string, Set<ClientConnection>> = new Map();
  private docHistory: Map<string, Op[]> = new Map();
  private siteClocks: Map<string, Map<string, number>> = new Map(); // docId -> (siteId -> highest counter)
  private authorizer: AuthorizerFn;
  private sessionCheckInterval?: NodeJS.Timeout;
  private snapshotDebounceTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(authorizer?: AuthorizerFn) {
    this.authorizer = authorizer || defaultAuthorizer;
    this.startPeriodicSessionValidation();
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  getClientCount(): number {
    let count = 0;
    for (const room of this.rooms.values()) {
      count += room.size;
    }
    return count;
  }

  /**
   * Periodic re-validation to ensure logged-out or revoked sessions are promptly disconnected.
   */
  private startPeriodicSessionValidation(): void {
    if (typeof setInterval !== 'undefined') {
      this.sessionCheckInterval = setInterval(async () => {
        for (const room of this.rooms.values()) {
          for (const client of room) {
            if (client.docId?.startsWith('proj-') && client.sessionId) {
              const session = await getSession(client.sessionId);
              if (!session) {
                console.info(`[SyncServer] Disconnecting revoked session socket: connId=${client.id} user=${client.userId || 'none'}`);
                client.send(
                  JSON.stringify({
                    type: 'error',
                    docId: client.docId,
                    error: 'Session expired or invalidated',
                    code: 401,
                  })
                );
                client.close?.(4401, 'Session invalidated');
              }
            }
          }
        }
      }, 30000);
      this.sessionCheckInterval.unref?.();
    }
  }

  /**
   * Handle incoming raw message from a client
   */
  async handleMessage(client: ClientConnection, raw: string): Promise<void> {
    let msg: SyncMessage;
    try {
      msg = JSON.parse(raw);
    } catch {
      console.error('[SyncServer] Invalid JSON received:', raw);
      return;
    }

    try {
      console.log(
        `[SyncServer] Message received: connId=${client.id} docId=${msg.docId || client.docId || 'none'} user=${client.authenticatedUserId || 'anonymous'} type=${msg.type}`
      );

      switch (msg.type) {
        case 'join':
          await this.joinRoom(msg.docId, client, {
            siteId: msg.siteId,
            name: msg.name,
            color: msg.color,
            sessionId: msg.sessionId,
            token: msg.token,
            userId: msg.userId,
          });
          break;

        case 'op':
          if (msg.op && msg.docId) {
            if (!client.docId || client.docId !== msg.docId) {
              await this.joinRoom(msg.docId, client, { siteId: msg.siteId || msg.op.id.siteId });
            }
            this.handleOperation(client, msg.docId, msg.op);
          }
          break;

        case 'presence':
          if (msg.docId) {
            if (!client.docId) {
              await this.joinRoom(msg.docId, client, { siteId: msg.siteId });
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
    } catch (err) {
      console.error(
        `[SyncServer] Uncaught exception processing message: connId=${client.id} docId=${client.docId || 'none'} type=${msg.type} stack=${err instanceof Error ? err.stack : String(err)}`
      );
    }
  }

  /**
   * Join a document room, verify authorization, send history, and announce to peers
   */
  async joinRoom(
    docId: string,
    client: ClientConnection,
    info?: { siteId?: string; name?: string; color?: string; sessionId?: string; token?: string; userId?: string }
  ): Promise<boolean> {
    const siteId = info?.siteId || client.siteId || 'anonymous';
    const sessionId = info?.sessionId || client.sessionId;
    const token = info?.token;

    // Validate token if provided
    if (token) {
      const verified = verifyWebSocketToken(token);
      if (!verified.valid) {
        client.send(
          JSON.stringify({
            type: 'error',
            docId,
            error: verified.error || 'Unauthorized: Invalid or expired token',
            code: 401,
          })
        );
        if (client.close) client.close(4401, 'Invalid token');
        return false;
      }
    }

    // Resolve authenticated identity from token or session if not yet resolved on connection
    if (!client.authenticatedUserId && (token || sessionId)) {
      const auth = await authenticateCredentials({ token, sessionId });
      if (auth) {
        client.authenticatedUserId = auth.userId;
        client.sessionId = auth.sessionId;
        if (!client.name) client.name = auth.userName;
      }
    }

    const authenticatedUserId = client.authenticatedUserId;

    // 1. Authorize connection based on authenticated identity
    const auth = await this.authorizer({
      docId,
      authenticatedUserId,
      userId: authenticatedUserId || info?.userId,
      sessionId: client.sessionId || sessionId,
      siteId,
    });

    if (!auth.allowed) {
      console.warn(
        `[SyncServer] Unauthorized room join rejected: docId=${docId}, user=${authenticatedUserId || 'none'}, code=${auth.code || 403}`
      );
      client.send(
        JSON.stringify({
          type: 'error',
          docId,
          error: auth.error || 'Forbidden: Access denied',
          code: auth.code || 403,
        })
      );
      if (client.close) {
        const closeCode = auth.code === 401 ? 4401 : auth.code === 403 ? 4403 : 1000;
        client.close(closeCode, auth.error || 'Authorization failed');
      }
      return false;
    }

    if (client.docId && client.docId !== docId) {
      this.handleDisconnect(client);
    }

    client.docId = docId;
    if (info?.siteId) client.siteId = info.siteId;
    if (info?.name) client.name = info.name;
    if (info?.color) client.color = info.color;
    client.userId = auth.userId || authenticatedUserId;
    client.role = auth.role;
    client.isReadOnly = auth.readOnly ?? (auth.role === 'VIEWER');

    if (!this.rooms.has(docId)) {
      this.rooms.set(docId, new Set());
      this.siteClocks.set(docId, new Map());

      // If document history is not initialized, check for persisted database snapshot
      if (!this.docHistory.has(docId)) {
        try {
          const project = await getProject(docId);
          if (project && project.content) {
            this.docHistory.set(docId, textToBaselineOps(project.content));
          } else {
            this.docHistory.set(docId, []);
          }
        } catch {
          this.docHistory.set(docId, []);
        }
      }
    }

    const room = this.rooms.get(docId)!;
    room.add(client);

    // 2. Send initial sync catch-up with history and existing peers
    const history = this.docHistory.get(docId) || [];
    const peers = this.getPeers(docId);

    const syncMsg: SyncMessage = {
      type: 'sync',
      docId,
      history,
      peers,
    };
    client.send(JSON.stringify(syncMsg));

    // 3. Announce new peer presence to other room members
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
          role: client.role,
          action: 'join',
        },
        client.id
      );
    }

    return true;
  }

  /**
   * Append op to document history and relay to other peers (rejecting VIEWER mutations)
   */
  handleOperation(client: ClientConnection, docId: string, op: Op): void {
    const opSiteId = op?.id?.siteId || 'unknown';
    const opCounter = op?.id?.counter ?? 'unknown';
    console.log(
      `[SyncServer] Operation received: connId=${client.id} docId=${docId} user=${client.authenticatedUserId || 'anonymous'} opType=${op?.type} opId=${opSiteId}:${opCounter}`
    );

    // Viewer role cannot submit edits to room
    if (client.isReadOnly) {
      console.warn(
        `[SyncServer] Operation rejected (viewer is read-only): connId=${client.id} docId=${docId} user=${client.authenticatedUserId || 'anonymous'}`
      );
      client.send(
        JSON.stringify({
          type: 'error',
          docId,
          error: 'Forbidden: Viewer cannot submit edits',
          code: 403,
        })
      );
      return;
    }

    try {
      const history = this.docHistory.get(docId);
      if (history) {
        history.push(op);
        this.scheduleSnapshotPersistence(docId, 2000);
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

      console.log(
        `[SyncServer] Operation applied successfully: connId=${client.id} docId=${docId} user=${client.authenticatedUserId || 'anonymous'} opId=${opSiteId}:${opCounter}`
      );
    } catch (err) {
      console.error(
        `[SyncServer] Operation failed: connId=${client.id} docId=${docId} error=${err instanceof Error ? err.stack : String(err)}`
      );
    }
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
        role: client.role,
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
          role: client.role,
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
   * Reconstruct document text from CRDT history and persist snapshot to database
   */
  async persistDocumentSnapshot(docId: string): Promise<void> {
    const history = this.docHistory.get(docId);
    if (!history || history.length === 0) return;

    try {
      const rga = new RGA('server-snapshot');
      for (const op of history) {
        rga.applyRemote(op);
      }
      const text = rga.toString();
      await updateProjectContent(docId, text);
      console.log(`[SyncServer] Snapshot persistence success: docId=${docId} ops=${history.length}`);
    } catch (err) {
      console.error(
        `[SyncServer] Snapshot persistence failure: docId=${docId} error=${err instanceof Error ? err.stack : String(err)}`
      );
    }
  }

  scheduleSnapshotPersistence(docId: string, delayMs: number = 2000): void {
    const existing = this.snapshotDebounceTimers.get(docId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      this.snapshotDebounceTimers.delete(docId);
      await this.persistDocumentSnapshot(docId);
    }, delayMs);

    this.snapshotDebounceTimers.set(docId, timer);
  }

  async flushAllSnapshots(): Promise<void> {
    for (const [docId, timer] of this.snapshotDebounceTimers.entries()) {
      clearTimeout(timer);
      this.snapshotDebounceTimers.delete(docId);
    }
    const promises: Promise<void>[] = [];
    for (const docId of this.rooms.keys()) {
      promises.push(this.persistDocumentSnapshot(docId));
    }
    await Promise.all(promises);
  }

  /**
   * Stop background timers and flush snapshots
   */
  async close(): Promise<void> {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
    }
    await this.flushAllSnapshots();
  }

  /**
   * Bind to a Node.js WebSocketServer instance with HTTP upgrade authentication
   */
  attachWebSocketServer(wss: WebSocketServer): void {
    let clientCounter = 0;

    wss.on('connection', async (ws: WebSocket, req?: IncomingMessage) => {
      const clientId = `conn-${++clientCounter}-${Date.now().toString(36)}`;

      // Extract and validate session cookie from HTTP upgrade handshake
      let authenticatedUserId: string | undefined;
      let sessionId: string | undefined;
      let userName: string | undefined;

      if (req) {
        const creds = extractAuthCredentials(req.headers.cookie, req.url);
        const auth = await authenticateCredentials(creds);
        if (auth) {
          authenticatedUserId = auth.userId;
          sessionId = auth.sessionId;
          userName = auth.userName;
        }
      }

      console.log(
        `[SyncServer] WebSocket connected: connId=${clientId} user=${authenticatedUserId || 'anonymous'}`
      );

      const client: ClientConnection = {
        id: clientId,
        authenticatedUserId,
        sessionId,
        name: userName,
        send: (data: string) => {
          if (ws.readyState === ws.OPEN) {
            ws.send(data);
          }
        },
        close: (code: number = 1000, reason: string = 'Normal closure') => {
          try {
            ws.close(code, reason);
          } catch {}
        },
      };

      ws.on('message', async (data: Buffer | string) => {
        try {
          const text = typeof data === 'string' ? data : data.toString('utf-8');
          await this.handleMessage(client, text);
        } catch (err) {
          console.error(
            `[SyncServer] Message handling error: connId=${clientId} error=${err instanceof Error ? err.stack : String(err)}`
          );
        }
      });

      ws.on('close', (code: number, reason: Buffer) => {
        const reasonStr = reason && reason.length > 0 ? reason.toString('utf-8') : 'none';
        console.log(
          `[SyncServer] WebSocket closed: connId=${clientId} docId=${client.docId || 'none'} user=${client.authenticatedUserId || 'anonymous'} code=${code} reason=${reasonStr}`
        );
        this.handleDisconnect(client);
      });

      ws.on('error', (err: Error) => {
        console.error(
          `[SyncServer] WebSocket error: connId=${clientId} docId=${client.docId || 'none'} user=${client.authenticatedUserId || 'anonymous'} error=${err.stack || err.message}`
        );
        this.handleDisconnect(client);
      });
    });
  }
}

export default SyncServer;
