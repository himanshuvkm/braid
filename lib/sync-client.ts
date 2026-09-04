import type { Op } from '../crdt-engine/src/index';
import { RGA, idKey } from '../crdt-engine/src/index';
import type { PeerInfo, SyncMessage } from '../sync-server/server';

export type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'offline'
  | 'error'
  | 'disconnected';

export interface BufferedOpEntry {
  op: Op;
  bufferedAt: number;
  retryCount: number;
  missingDependency: string;
}

export interface CausalBufferOptions {
  maxBufferSize?: number;
  warnRetryThreshold?: number;
  maxTtlMs?: number;
  onOverflow?: (droppedOp: Op) => void;
  onStuckOp?: (entry: BufferedOpEntry) => void;
}

export interface CausalBufferDiagnostics {
  size: number;
  maxBufferSize: number;
  oldestOpAgeMs: number;
  maxRetries: number;
  entries: Array<{
    id: string;
    type: 'insert' | 'delete';
    dependency: string;
    ageMs: number;
    retryCount: number;
  }>;
}

export interface WebSocketLike {
  readyState: number;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  onopen: ((event: any) => void) | null;
  onmessage: ((event: any) => void) | null;
  onclose: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  /* eslint-enable @typescript-eslint/no-explicit-any */
  send(data: string): void;
  close(code?: number, reason?: string): void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WebSocketConstructor = new (...args: any[]) => WebSocketLike;

export interface SyncClientConfig {
  serverUrl: string;
  docId: string;
  siteId: string;
  name?: string;
  color?: string;
  userId?: string;
  sessionId?: string;
  token?: string;
  getToken?: () => Promise<string | null>;
  autoConnect?: boolean;
  reconnectIntervalMs?: number;
  maxReconnectIntervalMs?: number;
  /** Custom WebSocket constructor (e.g. `ws` for Node.js / testing environments) */
  WebSocketClass?: WebSocketConstructor;
  causalBufferOptions?: CausalBufferOptions;
  onRemoteOp?: (op: Op) => void;
  onBatchOpsApplied?: (appliedOps: Op[]) => void;
  onSyncComplete?: (history: readonly Op[], appliedOps: Op[]) => void;
  onPresenceChange?: (peers: PeerInfo[]) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
  onError?: (error: { message: string; code?: number }) => void;
}

/**
 * CausalBuffer manages out-of-order CRDT operations.
 *
 * RGA requires causal delivery: an insert's originId and a delete's targetId
 * must already be present in the local RGA sequence before the op can integrate.
 * If ops arrive out of order (e.g. over a jittery network or parallel streams),
 * CausalBuffer holds them and retries integration whenever any new op arrives.
 *
 * Key guarantees:
 * 1. Only genuine causal dependency errors are buffered; real bugs throw immediately.
 * 2. Memory is bounded by maxBufferSize (with FIFO eviction).
 * 3. Stuck ops can be diagnosed and pruned with metrics and warnings.
 */
export class CausalBuffer {
  private buffer: Map<string, BufferedOpEntry> = new Map();
  private readonly maxBufferSize: number;
  private readonly warnRetryThreshold: number;
  private readonly maxTtlMs: number;
  private readonly onOverflow?: (droppedOp: Op) => void;
  private readonly onStuckOp?: (entry: BufferedOpEntry) => void;

  constructor(options?: CausalBufferOptions) {
    this.maxBufferSize = options?.maxBufferSize ?? 1000;
    this.warnRetryThreshold = options?.warnRetryThreshold ?? 20;
    this.maxTtlMs = options?.maxTtlMs ?? 60000;
    this.onOverflow = options?.onOverflow;
    this.onStuckOp = options?.onStuckOp;
  }

  get size(): number {
    return this.buffer.size;
  }

  getPendingOps(): Op[] {
    return Array.from(this.buffer.values()).map((entry) => entry.op);
  }

  clear(): void {
    this.buffer.clear();
  }

  /**
   * Check if an error is a valid causal dependency wait (as opposed to a real bug)
   */
  private isCausalDependencyError(err: unknown): boolean {
    return err instanceof Error && err.message.includes('not yet known');
  }

  private getDependencyDescription(op: Op): string {
    if (op.type === 'insert') {
      return op.originId ? `origin ${idKey(op.originId)}` : 'root';
    }
    return `target ${idKey(op.targetId)}`;
  }

  private addToBuffer(key: string, op: Op): void {
    if (this.buffer.size >= this.maxBufferSize && !this.buffer.has(key)) {
      // Evict oldest entry to bound memory
      const oldestKey = this.buffer.keys().next().value;
      if (oldestKey !== undefined) {
        const evicted = this.buffer.get(oldestKey);
        this.buffer.delete(oldestKey);
        if (evicted) {
          console.warn(
            `[CausalBuffer] Buffer capacity exceeded (max ${this.maxBufferSize}). Evicting oldest stuck op: ${oldestKey} ` +
              `(waiting for ${evicted.missingDependency}, retries: ${evicted.retryCount})`
          );
          this.onOverflow?.(evicted.op);
        }
      }
    }

    const existing = this.buffer.get(key);
    if (existing) {
      existing.retryCount++;
    } else {
      this.buffer.set(key, {
        op,
        bufferedAt: Date.now(),
        retryCount: 0,
        missingDependency: this.getDependencyDescription(op),
      });
    }
  }

  /**
   * Attempt to apply an op to the RGA instance.
   * If its causal dependencies are not yet satisfied, store it in the buffer.
   * If an unexpected non-causal error occurs, it is re-thrown immediately.
   * Returns true if integrated immediately, false if buffered.
   */
  tryApply(rga: RGA, op: Op): boolean {
    const key = idKey(op.id);
    try {
      rga.applyRemote(op);
      this.buffer.delete(key);
      return true;
    } catch (err) {
      if (this.isCausalDependencyError(err)) {
        this.addToBuffer(key, op);
        return false;
      }
      // Real bug (malformed op, corruption, etc.) — do NOT hide as a causal wait
      throw err;
    }
  }

  /**
   * Drain the buffer by repeatedly attempting to apply buffered ops until
   * no further progress can be made (a full pass integrates 0 new ops).
   * Returns the list of ops that were successfully integrated in this flush.
   */
  flush(rga: RGA): Op[] {
    const applied: Op[] = [];
    let progress = true;

    while (progress && this.buffer.size > 0) {
      progress = false;
      for (const [key, entry] of Array.from(this.buffer.entries())) {
        try {
          rga.applyRemote(entry.op);
          this.buffer.delete(key);
          applied.push(entry.op);
          progress = true;
        } catch (err) {
          if (this.isCausalDependencyError(err)) {
            entry.retryCount++;
            if (entry.retryCount === this.warnRetryThreshold) {
              console.warn(
                `[CausalBuffer] Op ${key} has failed ${entry.retryCount} integration attempts. ` +
                  `Missing dependency: ${entry.missingDependency}`
              );
              this.onStuckOp?.(entry);
            }
          } else {
            // Unexpected bug in applyRemote — surface immediately
            throw err;
          }
        }
      }
    }

    return applied;
  }

  /**
   * Ingest a batch of ops (e.g. from history or out-of-order delivery),
   * applying what is ready and draining the buffer to fix order dependencies.
   */
  applyBatch(rga: RGA, ops: readonly Op[]): Op[] {
    const applied: Op[] = [];
    for (const op of ops) {
      if (this.tryApply(rga, op)) {
        applied.push(op);
      }
    }
    const flushed = this.flush(rga);
    return [...applied, ...flushed];
  }

  /**
   * Prune expired ops from the buffer based on TTL
   */
  prune(maxAgeMs: number = this.maxTtlMs): Op[] {
    if (maxAgeMs <= 0) return [];
    const now = Date.now();
    const expired: Op[] = [];

    for (const [key, entry] of Array.from(this.buffer.entries())) {
      if (now - entry.bufferedAt > maxAgeMs) {
        this.buffer.delete(key);
        expired.push(entry.op);
        console.warn(
          `[CausalBuffer] Pruning expired op ${key} (age: ${now - entry.bufferedAt}ms, missing: ${entry.missingDependency})`
        );
        this.onStuckOp?.(entry);
      }
    }
    return expired;
  }

  /**
   * Expose buffer diagnostics for observability and debugging
   */
  getDiagnostics(): CausalBufferDiagnostics {
    const now = Date.now();
    let oldestAge = 0;
    let maxRetries = 0;

    const entries: CausalBufferDiagnostics['entries'] = [];
    for (const [key, entry] of this.buffer.entries()) {
      const ageMs = now - entry.bufferedAt;
      if (ageMs > oldestAge) oldestAge = ageMs;
      if (entry.retryCount > maxRetries) maxRetries = entry.retryCount;

      entries.push({
        id: key,
        type: entry.op.type,
        dependency: entry.missingDependency,
        ageMs,
        retryCount: entry.retryCount,
      });
    }

    return {
      size: this.buffer.size,
      maxBufferSize: this.maxBufferSize,
      oldestOpAgeMs: oldestAge,
      maxRetries,
      entries,
    };
  }
}

/**
 * SyncClient connects a local CRDT replica to the WebSocket SyncServer.
 * It manages connection lifecycle, outgoing queues for offline edits,
 * causal buffering of remote ops, and peer presence.
 */
export class SyncClient {
  public readonly clientId: string;
  private connectionSeq = 0;
  private currentConnectionId: string = '';
  private socket: WebSocketLike | null = null;
  private readonly config: Required<
    Pick<
      SyncClientConfig,
      | 'serverUrl'
      | 'docId'
      | 'siteId'
      | 'autoConnect'
      | 'reconnectIntervalMs'
      | 'maxReconnectIntervalMs'
    >
  > &
    SyncClientConfig;

  private status: ConnectionStatus = 'disconnected';
  private outgoingQueue: Op[] = [];
  private causalBuffer: CausalBuffer;
  private peers: Map<string, PeerInfo> = new Map();
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private currentReconnectDelay: number;
  private intentionallyClosed = false;
  private joinedPromise: Promise<void> | null = null;
  private resolveJoined: (() => void) | null = null;
  private currentToken: string | undefined;

  constructor(config: SyncClientConfig) {
    this.clientId = `client-${Math.random().toString(36).substring(2, 9)}`;
    this.currentToken = config.token;
    this.config = {
      name: `User-${config.siteId.slice(0, 4)}`,
      color: '#6366f1',
      autoConnect: false,
      reconnectIntervalMs: 1000,
      maxReconnectIntervalMs: 16000,
      ...config,
    };
    this.currentReconnectDelay = this.config.reconnectIntervalMs;
    this.causalBuffer = new CausalBuffer(config.causalBufferOptions);

    this.resetJoinedPromise();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }

    if (this.config.autoConnect) {
      this.connect();
    }
  }

  private handleOnline = (): void => {
    console.log('[SyncClient] network restored (navigator.onLine=true)');
    if (!this.intentionallyClosed && this.status !== 'connected' && this.status !== 'error') {
      this.currentReconnectDelay = this.config.reconnectIntervalMs;
      this.connect();
    }
  };

  private handleOffline = (): void => {
    console.log('[SyncClient] network offline (navigator.onLine=false)');
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.setStatus('offline');
  };

  private resetJoinedPromise(): void {
    this.joinedPromise = new Promise<void>((resolve) => {
      this.resolveJoined = resolve;
    });
  }

  get connectionStatus(): ConnectionStatus {
    return this.status;
  }

  get isConnected(): boolean {
    return this.status === 'connected';
  }

  get buffer(): CausalBuffer {
    return this.causalBuffer;
  }

  get pendingOutgoingCount(): number {
    return this.outgoingQueue.length;
  }

  get reconnectDelay(): number {
    return this.currentReconnectDelay;
  }

  get connectedPeers(): PeerInfo[] {
    return Array.from(this.peers.values());
  }

  /**
   * Resolves when the client has connected to WebSocket AND received sync confirmation from server
   */
  whenJoined(): Promise<void> {
    return this.joinedPromise || Promise.resolve();
  }

  get connectionId(): string {
    return this.currentConnectionId;
  }

  async connect(): Promise<void> {
    if (this.status === 'connected' || this.status === 'connecting') return;

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      console.log('[SyncClient] network offline, postponing connection');
      this.setStatus('offline');
      return;
    }

    this.intentionallyClosed = false;
    this.resetJoinedPromise();
    this.setStatus('connecting');

    // If a token provider is supplied and no active token, retrieve fresh token
    if (this.config.getToken && !this.currentToken) {
      try {
        const token = await this.config.getToken();
        if (token) {
          this.currentToken = token;
        } else {
          console.warn('[SyncClient] Auth token acquisition returned null/unauthorized');
          this.intentionallyClosed = true;
          this.setStatus('error');
          this.config.onError?.({ message: 'Authentication required: session expired', code: 401 });
          return;
        }
      } catch (err) {
        console.error('[SyncClient] Failed to acquire authentication token:', err);
        this.intentionallyClosed = true;
        this.setStatus('error');
        this.config.onError?.({ message: 'Authentication error', code: 401 });
        return;
      }
    }

    const WSClass =
      this.config.WebSocketClass ||
      (typeof window !== 'undefined' ? (window.WebSocket as unknown as new (url: string) => WebSocketLike) : undefined);

    if (!WSClass) {
      console.warn('[SyncClient] No WebSocket implementation available in this environment.');
      this.setStatus('disconnected');
      return;
    }

    // Terminate any stale socket before opening a new one to prevent overlapping connections
    if (this.socket) {
      try {
        const stale = this.socket;
        this.socket = null;
        stale.onopen = null;
        stale.onmessage = null;
        stale.onclose = null;
        stale.onerror = null;
        stale.close(1000, 'Reconnecting');
      } catch {}
    }

    const connId = `${this.clientId}-conn-${++this.connectionSeq}`;
    this.currentConnectionId = connId;

    try {
      let targetUrl = this.config.serverUrl;
      const effectiveToken = this.currentToken || this.config.token;
      if (effectiveToken && !targetUrl.includes('token=')) {
        const separator = targetUrl.includes('?') ? '&' : '?';
        targetUrl = `${targetUrl}${separator}token=${encodeURIComponent(effectiveToken)}`;
      } else if (this.config.sessionId && !targetUrl.includes('sessionId=') && !targetUrl.includes('token=')) {
        const separator = targetUrl.includes('?') ? '&' : '?';
        targetUrl = `${targetUrl}${separator}sessionId=${encodeURIComponent(this.config.sessionId)}`;
      }

      const safeLogUrl = targetUrl.replace(/([?&](sessionId|token)=)[^&]+/i, '$1[REDACTED]');
      console.log(`[SyncClient] connecting (${this.clientId}:${connId}) ${safeLogUrl}`);

      const ws = new WSClass(targetUrl);
      this.socket = ws;

      ws.onopen = () => {
        if (this.socket !== ws) return;
        console.log(`[SyncClient] websocket opened (${this.clientId}:${connId})`);
        this.setStatus('connected');
        this.currentReconnectDelay = this.config.reconnectIntervalMs;
        this.sendJoin();
        this.flushOutgoingQueue();
      };

      ws.onmessage = (event: { data: unknown }) => {
        if (this.socket !== ws) return;
        const raw = typeof event.data === 'string' ? event.data : (event.data as Buffer)?.toString?.('utf-8');
        if (!raw) return;
        try {
          const message: SyncMessage = JSON.parse(raw);
          this.handleServerMessage(message);
        } catch (err) {
          console.error(`[SyncClient] Failed to parse message from server (${this.clientId}:${connId}):`, err);
        }
      };

      ws.onclose = (event?: { code?: number; reason?: string }) => {
        if (this.socket !== ws) return;
        this.socket = null;
        this.peers.clear();
        const code = event?.code ?? 1006;
        console.log(`[SyncClient] websocket closed (${this.clientId}:${connId}) code=${code} reason=${event?.reason || 'none'}`);

        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          this.setStatus('offline');
        } else if (this.status === 'error') {
          // Keep error state
        } else if (!this.intentionallyClosed) {
          this.setStatus('reconnecting');
          this.scheduleReconnect();
        } else {
          this.setStatus('disconnected');
        }
      };

      ws.onerror = () => {
        if (this.socket !== ws) return;
        console.warn(`[SyncClient] WebSocket encountered an error (${this.clientId}:${connId})`);
      };
    } catch (err) {
      console.error(`[SyncClient] Failed to open WebSocket connection (${this.clientId}:${connId}):`, err);
      this.peers.clear();
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        this.setStatus('offline');
      } else if (!this.intentionallyClosed) {
        this.setStatus('reconnecting');
        this.scheduleReconnect();
      } else {
        this.setStatus('disconnected');
      }
    }
  }

  private setStatus(newStatus: ConnectionStatus): void {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.config.onStatusChange?.(newStatus);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout || this.intentionallyClosed) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.setStatus('offline');
      return;
    }

    const delay = this.currentReconnectDelay;
    console.log(`[SyncClient] reconnecting in ${delay}ms`);

    this.currentReconnectDelay = Math.min(
      this.currentReconnectDelay * 1.5,
      this.config.maxReconnectIntervalMs
    );

    this.reconnectTimeout = setTimeout(async () => {
      this.reconnectTimeout = null;
      if (!this.intentionallyClosed && (this.status === 'reconnecting' || this.status === 'disconnected')) {
        // Invalidate cached token so reconnect fetches a fresh short-lived token via getToken()
        if (this.config.getToken) {
          this.currentToken = undefined;
        }
        await this.connect();
      }
    }, delay);
  }

  private sendJoin(): void {
    const msg: SyncMessage = {
      type: 'join',
      docId: this.config.docId,
      siteId: this.config.siteId,
      name: this.config.name,
      color: this.config.color,
      userId: this.config.userId,
      sessionId: this.config.sessionId,
      token: this.currentToken || this.config.token,
    };
    this.sendRaw(msg);
  }

  /**
   * Broadcast a locally-created operation to peers.
   * If disconnected, operation is queued and sent automatically upon reconnection.
   */
  sendOperation(op: Op): void {
    if (!this.isConnected || !this.socket || this.socket.readyState !== 1 /* OPEN */) {
      this.outgoingQueue.push(op);
      return;
    }

    const msg: SyncMessage = {
      type: 'op',
      docId: this.config.docId,
      siteId: this.config.siteId,
      op,
    };
    this.sendRaw(msg);
  }

  /**
   * Send cursor position or presence metadata update
   */
  sendPresence(presence: { cursor?: number; name?: string; color?: string }): void {
    if (presence.name) this.config.name = presence.name;
    if (presence.color) this.config.color = presence.color;

    if (!this.isConnected || !this.socket || this.socket.readyState !== 1) {
      return;
    }

    const msg: SyncMessage = {
      type: 'presence',
      docId: this.config.docId,
      siteId: this.config.siteId,
      name: this.config.name,
      color: this.config.color,
      cursor: presence.cursor,
      action: 'update',
    };
    this.sendRaw(msg);
  }

  /**
   * Send causal counter ack to server (used for tombstone GC coordination)
   */
  sendAck(counter: number): void {
    if (!this.isConnected || !this.socket || this.socket.readyState !== 1) {
      return;
    }

    const msg: SyncMessage = {
      type: 'ack',
      docId: this.config.docId,
      siteId: this.config.siteId,
      counter,
    };
    this.sendRaw(msg);
  }

  /**
   * Apply an incoming remote op to a local RGA instance with causal ordering guarantees.
   * Resolves any newly satisfied causal dependencies from the buffer.
   */
  applyRemoteOp(rga: RGA, op: Op): Op[] {
    const applied: Op[] = [];
    if (this.causalBuffer.tryApply(rga, op)) {
      applied.push(op);
    }
    const flushed = this.causalBuffer.flush(rga);
    const totalApplied = [...applied, ...flushed];

    if (totalApplied.length > 0) {
      this.config.onBatchOpsApplied?.(totalApplied);
    }
    return totalApplied;
  }

  /**
   * Ingest a batch of ops (such as document history upon initial room sync)
   * into a local RGA instance.
   */
  applyHistory(rga: RGA, history: readonly Op[]): Op[] {
    const applied = this.causalBuffer.applyBatch(rga, history);
    if (applied.length > 0) {
      this.config.onBatchOpsApplied?.(applied);
    }
    return applied;
  }

  private flushOutgoingQueue(): void {
    while (this.outgoingQueue.length > 0 && this.isConnected && this.socket?.readyState === 1) {
      const op = this.outgoingQueue.shift();
      if (op) {
        this.sendOperation(op);
      }
    }
  }

  private sendRaw(msg: SyncMessage): void {
    try {
      if (this.socket && this.socket.readyState === 1 /* OPEN */) {
        this.socket.send(JSON.stringify(msg));
      }
    } catch (err) {
      console.error('[SyncClient] Error sending message:', err);
    }
  }

  private handleServerMessage(msg: SyncMessage): void {
    switch (msg.type) {
      case 'op':
        if (msg.op && msg.op.id.siteId !== this.config.siteId) {
          this.config.onRemoteOp?.(msg.op);
        }
        break;

      case 'sync':
        this.resolveJoined?.();
        this.peers.clear();
        if (msg.peers) {
          for (const p of msg.peers) {
            if (p.siteId !== this.config.siteId) {
              this.peers.set(p.siteId, p);
            }
          }
          this.config.onPresenceChange?.(Array.from(this.peers.values()));
        }
        if (msg.history) {
          this.config.onSyncComplete?.(msg.history, []);
        }
        break;

      case 'presence':
        if (msg.siteId && msg.siteId !== this.config.siteId) {
          if (msg.action === 'join' || msg.action === 'update' || !msg.action) {
            this.peers.set(msg.siteId, {
              siteId: msg.siteId,
              name: msg.name,
              color: msg.color,
              cursor: msg.cursor,
            });
            this.config.onPresenceChange?.(Array.from(this.peers.values()));
          } else if (msg.action === 'leave') {
            this.peers.delete(msg.siteId);
            this.config.onPresenceChange?.(Array.from(this.peers.values()));
          }
        }
        break;

      case 'peers':
        this.peers.clear();
        if (msg.peers) {
          for (const p of msg.peers) {
            if (p.siteId !== this.config.siteId) {
              this.peers.set(p.siteId, p);
            }
          }
          this.config.onPresenceChange?.(Array.from(this.peers.values()));
        }
        break;

      case 'error':
        this.config.onError?.({ message: msg.error, code: msg.code });
        if (msg.code === 401) {
          console.warn('[SyncClient] authentication rejected (code: 401)');
          this.intentionallyClosed = true;
          if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
          }
          this.setStatus('error');
          if (this.socket) {
            try {
              this.socket.close();
            } catch {}
            this.socket = null;
          }
        } else if (msg.code === 403) {
          console.warn('[SyncClient] project authorization rejected (code: 403)');
          this.intentionallyClosed = true;
          if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
          }
          this.setStatus('error');
          if (this.socket) {
            try {
              this.socket.close();
            } catch {}
            this.socket = null;
          }
        }
        break;
    }
  }

  disconnect(): void {
    this.intentionallyClosed = true;
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.socket) {
      try {
        const ws = this.socket;
        this.socket = null;
        ws.onopen = null;
        ws.onmessage = null;
        ws.onclose = null;
        ws.onerror = null;
        ws.close(1000, 'Client disconnected');
      } catch {}
      this.socket = null;
    }
    this.peers.clear();
    this.currentReconnectDelay = this.config.reconnectIntervalMs;
    this.setStatus('disconnected');
  }
}

export default SyncClient;
