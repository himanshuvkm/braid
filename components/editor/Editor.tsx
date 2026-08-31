'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { RGA, idsEqual } from '../../crdt-engine/src/index';
import type { Op, OpId } from '../../crdt-engine/src/index';
import { SyncClient, ConnectionStatus } from '../../lib/sync-client';
import type { PeerInfo } from '../../sync-server/server';
import { getStoredUserName, setStoredUserName, getStoredRoomName, setStoredRoomName } from '../../lib/room-storage';

interface EditorProps {
  documentId: string;
  initialRoomName?: string;
  initialUserName?: string;
  siteId?: string;
  serverUrl?: string;
  userName?: string;
  userColor?: string;
  initialContent?: string;
  onOperation?: (op: Op) => void;
}

const PASTEL_COLORS = [
  '#F5C6B0',
  '#F4A5A0',
  '#E8A0BF',
  '#B0D0F5',
  '#B0F5D0',
  '#E5B0F5',
  '#F5E0B0',
];

function getPeerColor(id: string): string {
  if (!id) return PASTEL_COLORS[0];
  const hash = id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return PASTEL_COLORS[hash % PASTEL_COLORS.length];
}

let cachedClientSiteId: string | null = null;

function getClientSiteId(): string {
  if (cachedClientSiteId) return cachedClientSiteId;
  let stored: string | null = null;
  try {
    if (typeof sessionStorage !== 'undefined') {
      stored = sessionStorage.getItem('braid:siteId');
    }
  } catch {}

  cachedClientSiteId = stored || `site-${Math.random().toString(36).substring(2, 8)}`;
  if (typeof sessionStorage !== 'undefined' && !stored) {
    try {
      sessionStorage.setItem('braid:siteId', cachedClientSiteId);
    } catch {}
  }
  return cachedClientSiteId;
}

const emptySubscribe = () => () => {};

function createRGAWithContent(siteId: string, initialContent?: string): RGA {
  const rga = new RGA(siteId);
  if (initialContent && initialContent.length > 0) {
    let cursor: OpId | null = null;
    for (const ch of initialContent) {
      const op = rga.localInsert(cursor, ch);
      cursor = op.id;
    }
  }
  return rga;
}

function findVisibleOffsetForId(rga: RGA, targetId: OpId | null): number {
  if (targetId === null) return 0;
  const nodes = rga.getNodes();
  let visibleOffset = 0;
  let lastVisibleBeforeTarget = 0;

  for (const node of nodes) {
    if (!node.deleted) {
      visibleOffset++;
      lastVisibleBeforeTarget = visibleOffset;
    }
    if (idsEqual(node.id, targetId)) {
      return node.deleted ? lastVisibleBeforeTarget : visibleOffset;
    }
  }

  return visibleOffset;
}

export const Editor: React.FC<EditorProps> = ({
  documentId,
  initialRoomName,
  initialUserName: propInitialUserName,
  siteId: initialSiteId,
  serverUrl: propServerUrl,
  userName: explicitUserName,
  userColor: initialUserColor,
  initialContent = '',
  onOperation,
}) => {
  // Deterministic SSR & initial hydration value vs client post-hydration siteId
  const siteId = useSyncExternalStore(
    emptySubscribe,
    () => initialSiteId || getClientSiteId(),
    () => initialSiteId || ''
  );

  // Deterministic SSR & initial hydration value vs client post-hydration userName
  const clientStoredUserName = useSyncExternalStore(
    emptySubscribe,
    () => explicitUserName || propInitialUserName || getStoredUserName(documentId) || '',
    () => explicitUserName || propInitialUserName || ''
  );

  const [enteredUserName, setEnteredUserName] = useState<string>('');
  const [gateInputName, setGateInputName] = useState<string>('');
  const [gateError, setGateError] = useState<string | undefined>();

  const activeUserName = enteredUserName || clientStoredUserName;
  const isJoined = Boolean(activeUserName.trim());

  const rga = useMemo(
    () => createRGAWithContent(siteId || '', initialContent),
    [siteId, initialContent]
  );

  const [text, setText] = useState<string>(() => rga.getText() || initialContent);
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [pendingOpsCount, setPendingOpsCount] = useState<number>(0);
  const [tombstoneCount, setTombstoneCount] = useState<number>(0);
  const [copyFeedback, setCopyFeedback] = useState<'id' | 'link' | null>(null);
  const [showPeersDropdown, setShowPeersDropdown] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const syncClientRef = useRef<SyncClient | null>(null);

  // Derive stable roomName
  const roomName = useMemo(() => {
    if (initialRoomName?.trim()) return initialRoomName.trim();
    const stored = getStoredRoomName(documentId);
    if (stored) return stored;
    if (documentId === 'demo') return 'Demo Playground';
    return `Room ${documentId}`;
  }, [documentId, initialRoomName]);

  // Save room name to storage if provided
  useEffect(() => {
    if (initialRoomName?.trim()) {
      setStoredRoomName(documentId, initialRoomName.trim());
    }
  }, [documentId, initialRoomName]);

  const userColor = initialUserColor || (siteId ? getPeerColor(siteId) : PASTEL_COLORS[0]);

  const updateMetrics = useCallback(() => {
    setText(rga.getText());
    const deletedNodes = rga.getNodes().filter((n) => n.deleted).length;
    setTombstoneCount(deletedNodes);
    if (syncClientRef.current) {
      setPendingOpsCount(syncClientRef.current.pendingOutgoingCount);
    }
  }, [rga]);

  // SyncClient connection setup - ONLY connects if user is joined and has a valid name and siteId
  useEffect(() => {
    if (!siteId || !isJoined || !activeUserName) return;

    const wsUrl =
      propServerUrl ||
      process.env.NEXT_PUBLIC_WS_URL ||
      (typeof window !== 'undefined'
        ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:4444`
        : 'ws://localhost:4444');

    const client = new SyncClient({
      serverUrl: wsUrl,
      docId: documentId,
      siteId,
      name: activeUserName,
      color: userColor,
      autoConnect: true,
      onRemoteOp: (op: Op) => {
        const textarea = textareaRef.current;
        const selStart = textarea?.selectionStart ?? 0;
        const selEnd = textarea?.selectionEnd ?? 0;

        const anchorStartId = selStart === 0 ? null : rga.idAtVisibleOffset(selStart);
        const anchorEndId = selEnd === 0 ? null : rga.idAtVisibleOffset(selEnd);

        client.applyRemoteOp(rga, op);
        updateMetrics();

        if (textarea && (document.activeElement === textarea || selStart !== 0)) {
          const newStart = findVisibleOffsetForId(rga, anchorStartId);
          const newEnd = findVisibleOffsetForId(rga, anchorEndId);
          queueMicrotask(() => {
            if (textareaRef.current) {
              textareaRef.current.setSelectionRange(newStart, newEnd);
            }
          });
        }
      },
      onSyncComplete: (history: readonly Op[]) => {
        const textarea = textareaRef.current;
        const selStart = textarea?.selectionStart ?? 0;
        const selEnd = textarea?.selectionEnd ?? 0;
        const anchorStartId = selStart === 0 ? null : rga.idAtVisibleOffset(selStart);
        const anchorEndId = selEnd === 0 ? null : rga.idAtVisibleOffset(selEnd);

        client.applyHistory(rga, history);
        updateMetrics();

        if (textarea && (document.activeElement === textarea || selStart !== 0)) {
          const newStart = findVisibleOffsetForId(rga, anchorStartId);
          const newEnd = findVisibleOffsetForId(rga, anchorEndId);
          queueMicrotask(() => {
            if (textareaRef.current) {
              textareaRef.current.setSelectionRange(newStart, newEnd);
            }
          });
        }
      },
      onPresenceChange: (activePeers: PeerInfo[]) => {
        setPeers(activePeers.filter((p) => p.siteId !== siteId));
      },
      onStatusChange: (status: ConnectionStatus) => {
        setConnectionStatus(status);
        if (syncClientRef.current) {
          setPendingOpsCount(syncClientRef.current.pendingOutgoingCount);
        }
      },
    });

    syncClientRef.current = client;

    return () => {
      client.disconnect();
      syncClientRef.current = null;
    };
  }, [documentId, siteId, isJoined, activeUserName, userColor, propServerUrl, rga, updateMetrics]);

  // Handle local user typing
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!siteId || !isJoined) return;
    const newText = e.target.value;
    const oldText = rga.getText();

    if (newText === oldText) return;

    let prefix = 0;
    while (
      prefix < oldText.length &&
      prefix < newText.length &&
      oldText[prefix] === newText[prefix]
    ) {
      prefix++;
    }

    let oldSuffix = oldText.length - 1;
    let newSuffix = newText.length - 1;
    while (
      oldSuffix >= prefix &&
      newSuffix >= prefix &&
      oldText[oldSuffix] === newText[newSuffix]
    ) {
      oldSuffix--;
      newSuffix--;
    }

    const deleteCount = oldSuffix - prefix + 1;
    const insertText = newText.slice(prefix, newSuffix + 1);

    for (let i = 0; i < deleteCount; i++) {
      const targetId = rga.idAtVisibleOffset(prefix + 1);
      if (targetId) {
        const op = rga.localDelete(targetId);
        syncClientRef.current?.sendOperation(op);
        onOperation?.(op);
      }
    }

    for (let i = 0; i < insertText.length; i++) {
      const char = insertText[i];
      const afterId = prefix + i === 0 ? null : rga.idAtVisibleOffset(prefix + i);
      const op = rga.localInsert(afterId, char);
      syncClientRef.current?.sendOperation(op);
      onOperation?.(op);
    }

    updateMetrics();
  };

  const handleSelectionChange = () => {
    if (textareaRef.current && syncClientRef.current) {
      const cursor = textareaRef.current.selectionStart;
      syncClientRef.current.sendPresence({ cursor });
    }
  };

  const handleCopyId = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(documentId);
      setCopyFeedback('id');
      setTimeout(() => setCopyFeedback(null), 2000);
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      const url = `${window.location.origin}/doc/${documentId}`;
      navigator.clipboard.writeText(url);
      setCopyFeedback('link');
      setTimeout(() => setCopyFeedback(null), 2000);
    }
  };

  const handleJoinGateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = gateInputName.trim();
    if (!trimmed) {
      setGateError('Please enter your name to join the room');
      return;
    }
    setStoredUserName(trimmed, documentId);
    setEnteredUserName(trimmed);
  };

  // If user is not yet joined (direct room URL without prior identity), show Join Room gate
  if (!isJoined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] w-full p-4">
        <div className="w-full max-w-md rounded-2xl bg-[#faf8f5] border border-[#e4e4e7] p-8 shadow-sm flex flex-col gap-6">
          <div className="flex flex-col gap-2 text-center">
            <div className="inline-flex items-center justify-center gap-2 mx-auto px-3 py-1 rounded-full bg-[#ececf0] text-xs font-semibold text-[#666666]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Collaborative Session
            </div>
            <h2 className="text-2xl font-black tracking-tight text-[#000000]">Join Room</h2>
            <div className="flex items-center justify-center gap-1.5 text-xs text-[#666666]">
              <span className="font-semibold text-[#000000]">{roomName}</span>
              <span>•</span>
              <span className="font-mono bg-[#ececf0] px-2 py-0.5 rounded-full">{documentId}</span>
            </div>
          </div>

          <form onSubmit={handleJoinGateSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="join-gate-name" className="block text-xs font-bold text-[#000000] mb-1.5">
                Your Name
              </label>
              <input
                id="join-gate-name"
                type="text"
                placeholder="e.g. Alice, Rahul, Himanshu"
                value={gateInputName}
                onChange={(e) => {
                  setGateInputName(e.target.value);
                  if (gateError) setGateError(undefined);
                }}
                autoFocus
                className={`w-full px-4 py-2.5 rounded-xl bg-[#ffffff] border text-sm text-[#000000] placeholder-[#666666]/50 outline-none transition-all ${
                  gateError
                    ? 'border-red-500 focus:ring-2 focus:ring-red-400/20'
                    : 'border-[#e4e4e7] focus:border-[#000000]'
                }`}
              />
              {gateError && (
                <p className="text-[11px] text-red-600 mt-1 font-medium">{gateError}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-full bg-[#000000] text-[#ffffff] text-xs font-bold hover:opacity-90 active:scale-[0.99] transition-all shadow-sm flex items-center justify-center gap-1.5 mt-2"
            >
              <span>Join Room</span>
              <span>→</span>
            </button>
          </form>

          <div className="text-center pt-2 border-t border-[#e4e4e7]">
            <Link href="/" className="text-xs text-[#666666] hover:text-[#000000] transition-colors">
              ← Back to Braid Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const totalCollaborators = peers.length + 1;

  return (
    <div className="flex flex-col h-full w-full rounded-2xl bg-[#faf8f5] text-[#000000] border border-[#e4e4e7] overflow-hidden shadow-sm">
      {/* Editor Header / Top Workspace Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-4 bg-[#faf8f5] border-b border-[#e4e4e7] gap-3">
        {/* Left: Branding, Room Name & Room ID */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className="text-base font-black tracking-tight text-[#000000] hover:opacity-75 transition-opacity flex items-center gap-1.5"
            title="Back to Home"
          >
            <span>Braid</span>
            <span className="text-xs text-[#666666] font-normal">/</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-[#000000] tracking-tight">{roomName}</span>
            <div className="flex items-center gap-1 bg-[#ececf0] pl-2.5 pr-1.5 py-0.5 rounded-full text-xs font-mono text-[#666666]">
              <span>{documentId}</span>
              <button
                type="button"
                onClick={handleCopyId}
                className="p-1 hover:bg-[#e4e4e7] rounded-full transition-colors text-[10px]"
                title="Copy Room ID"
              >
                {copyFeedback === 'id' ? '✓' : '📋'}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Status, Collaborators & User Identity */}
        <div className="flex items-center gap-3">
          {/* Connection Status Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ececf0] text-xs font-medium text-[#666666]">
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-500'
                  : connectionStatus === 'connecting'
                  ? 'bg-amber-500 animate-pulse'
                  : 'bg-neutral-400'
              }`}
            />
            <span>
              {connectionStatus === 'connected'
                ? 'Connected'
                : connectionStatus === 'connecting'
                ? 'Connecting...'
                : 'Offline'}
            </span>
          </div>

          {/* Collaborator Count & Avatar Stack */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPeersDropdown((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ececf0] hover:bg-[#e4e4e7] text-xs font-semibold text-[#000000] transition-colors"
              title="View Collaborators"
            >
              <span>👥</span>
              <span>{totalCollaborators}</span>
            </button>

            {/* Collaborators Dropdown Menu */}
            {showPeersDropdown && (
              <div className="absolute right-0 top-full mt-2 w-56 p-3 rounded-2xl bg-[#ffffff] border border-[#e4e4e7] shadow-lg z-30 flex flex-col gap-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#666666] px-1">
                  Active in Room ({totalCollaborators})
                </div>
                <div className="flex flex-col gap-1.5">
                  {/* Current User */}
                  <div className="flex items-center gap-2 p-1.5 rounded-xl bg-[#faf8f5]">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-black border border-[#e4e4e7]"
                      style={{ backgroundColor: userColor }}
                    >
                      {activeUserName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold truncate">{activeUserName} (you)</span>
                      <span className="text-[10px] font-mono text-[#666666]">{siteId}</span>
                    </div>
                  </div>

                  {/* Remote Peers */}
                  {peers.map((peer) => (
                    <div key={peer.siteId} className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-[#faf8f5]">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-black border border-[#e4e4e7]"
                        style={{ backgroundColor: peer.color || '#F5C6B0' }}
                      >
                        {(peer.name || peer.siteId).slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold truncate">{peer.name || peer.siteId}</span>
                        <span className="text-[10px] font-mono text-[#666666]">{peer.siteId}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Current User Pill */}
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-black border border-[#e4e4e7] shadow-sm"
            style={{ backgroundColor: userColor }}
            title={siteId ? `You (${siteId})` : 'You'}
          >
            <span>{activeUserName}</span>
            <span className="text-[10px] opacity-75 font-mono">(you)</span>
          </div>

          {/* Share / Copy Link Button */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="text-xs font-semibold px-3 py-1 rounded-full bg-[#000000] text-[#ffffff] hover:opacity-90 transition-opacity shadow-sm flex items-center gap-1"
            title="Copy Invite Link"
          >
            <span>{copyFeedback === 'link' ? 'Copied!' : 'Share'}</span>
            <span className="text-[10px]">↗</span>
          </button>
        </div>
      </div>

      {/* Offline Warning Banner */}
      {connectionStatus === 'disconnected' && (
        <div className="px-6 py-2.5 bg-[#fef3c7] border-b border-[#fde68a] text-xs font-medium text-[#92400e] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>You are working offline. Edits will sync automatically when reconnected.</span>
          </div>
          {pendingOpsCount > 0 && (
            <span className="font-semibold bg-[#fde68a] px-2 py-0.5 rounded-full text-[11px]">
              {pendingOpsCount} queued
            </span>
          )}
        </div>
      )}

      {/* Main Textarea Paper Canvas */}
      <div className="relative flex-1 p-6 sm:p-8 bg-[#ffffff] min-h-[440px]">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onSelect={handleSelectionChange}
          onKeyUp={handleSelectionChange}
          onClick={handleSelectionChange}
          placeholder="Start typing to collaborate in real-time... Everyone in this room sees edits instantly."
          className="w-full h-full min-h-[400px] resize-none bg-transparent outline-none font-mono text-sm leading-relaxed text-[#000000] placeholder-[#666666]/40 selection:bg-[#f8c8b8]"
          spellCheck={false}
          autoFocus
        />
      </div>

      {/* Editor Footer / Diagnostics Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-3 bg-[#faf8f5] border-t border-[#e4e4e7] text-xs text-[#666666] gap-2">
        <div className="flex items-center gap-3 font-mono">
          <span>{text.length} chars</span>
          <span className="text-[#e4e4e7]">|</span>
          <span>{rga.getNodes().length} CRDT nodes</span>
          <span className="text-[#e4e4e7]">|</span>
          <span>{tombstoneCount} tombstones</span>
        </div>
        <div className="font-mono text-[11px] text-[#666666]">
          Site: {siteId || 'initializing...'}
        </div>
      </div>
    </div>
  );
};

export default Editor;
