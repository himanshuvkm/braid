'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { RGA } from '../../crdt-engine/src/index';
import type { Op, OpId } from '../../crdt-engine/src/index';
import { SyncClient, ConnectionStatus } from '../../lib/sync-client';
import { getWebSocketUrl } from '../../lib/ws-config';
import type { PeerInfo } from '../../sync-server/server';
import { getStoredUserName, setStoredUserName, getStoredRoomName, setStoredRoomName } from '../../lib/room-storage';
import { ExportDropdown } from './ExportDropdown';
import { Icons } from '../ui/icons';
import { Avatar } from '../ui/avatar';
import { Modal } from '../ui/modal';
import { Input } from '../ui/input';
import { PreviousDocumentsSidebar } from '../layout/PreviousDocumentsSidebar';

export type AutoSaveStatus = 'saved' | 'saving' | 'offline' | 'error';
export type EditorMode = 'text' | 'code';

export const CODE_LANGUAGES = [
  { value: 'javascript', label: 'JavaScript (JS)', ext: 'js' },
  { value: 'typescript', label: 'TypeScript (TS)', ext: 'ts' },
  { value: 'cpp', label: 'C++', ext: 'cpp' },
  { value: 'c', label: 'C', ext: 'c' },
  { value: 'java', label: 'Java', ext: 'java' },
  { value: 'python', label: 'Python (PY)', ext: 'py' },
  { value: 'rust', label: 'Rust', ext: 'rs' },
  { value: 'go', label: 'Go', ext: 'go' },
  { value: 'html', label: 'HTML', ext: 'html' },
  { value: 'css', label: 'CSS', ext: 'css' },
  { value: 'json', label: 'JSON', ext: 'json' },
  { value: 'sql', label: 'SQL', ext: 'sql' },
];

interface EditorProps {
  documentId: string;
  initialRoomName?: string;
  initialUserName?: string;
  siteId?: string;
  serverUrl?: string;
  userName?: string;
  userId?: string;
  sessionId?: string;
  wsToken?: string;
  userColor?: string;
  initialContent?: string;
  isReadOnly?: boolean;
  onOperation?: (op: Op) => void;
  onContentChange?: (content: string) => void;
  saveStatus?: AutoSaveStatus;
  onFlushSave?: () => Promise<void> | void;
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
  } catch { }

  cachedClientSiteId = stored || `site-${Math.random().toString(36).substring(2, 8)}`;
  if (typeof sessionStorage !== 'undefined' && !stored) {
    try {
      sessionStorage.setItem('braid:siteId', cachedClientSiteId);
    } catch { }
  }
  return cachedClientSiteId;
}

const emptySubscribe = () => () => { };

function createRGAWithContent(siteId: string, initialContent?: string): RGA {
  const rga = new RGA(siteId);
  if (initialContent && initialContent.length > 0) {
    const baselineRga = new RGA('init');
    let cursor: OpId | null = null;
    for (const ch of initialContent) {
      const op = baselineRga.localInsert(cursor, ch);
      cursor = op.id;
      rga.applyRemote(op);
    }
  }
  return rga;
}

export const Editor: React.FC<EditorProps> = ({
  documentId,
  initialRoomName,
  initialUserName: propInitialUserName,
  siteId: initialSiteId,
  serverUrl: propServerUrl,
  userName: explicitUserName,
  userId,
  sessionId,
  wsToken,
  userColor: initialUserColor,
  initialContent = '',
  isReadOnly = false,
  onOperation,
  onContentChange,
  saveStatus,
  onFlushSave,
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
    () => {
      const stored = getStoredUserName(documentId) || getStoredUserName();
      if (stored && stored.trim()) return stored.trim();
      if (explicitUserName && explicitUserName !== 'Collaborator') return explicitUserName;
      return propInitialUserName || (explicitUserName === 'Collaborator' ? '' : explicitUserName) || '';
    },
    () => (explicitUserName === 'Collaborator' ? '' : explicitUserName) || propInitialUserName || ''
  );

  const [enteredUserName, setEnteredUserName] = useState<string>('');
  const [gateInputName, setGateInputName] = useState<string>('');
  const [gateError, setGateError] = useState<string | undefined>();
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>('');

  const activeUserName = enteredUserName || clientStoredUserName;
  const isJoined = Boolean(activeUserName.trim());

  const handleOpenEditName = useCallback(() => {
    setNameInput(activeUserName === 'Collaborator' ? '' : activeUserName);
    setIsEditingName(true);
  }, [activeUserName]);

  const handleSaveName = useCallback((newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setEnteredUserName(trimmed);
    setStoredUserName(trimmed, documentId);
    setStoredUserName(trimmed);
    if (syncClientRef.current) {
      syncClientRef.current.sendPresence({ name: trimmed });
    }
    setIsEditingName(false);
  }, [documentId]);

  // Editor mode: Text vs Code
  const [mode, setMode] = useState<EditorMode>('text');
  const [codeLanguage, setCodeLanguage] = useState<string>('javascript');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

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
    const currentText = rga.getText();
    setText(currentText);
    const deletedNodes = rga.getNodes().filter((n) => n.deleted).length;
    setTombstoneCount(deletedNodes);
    if (syncClientRef.current) {
      setPendingOpsCount(syncClientRef.current.pendingOutgoingCount);
    }
  }, [rga]);

  const getToken = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch('/api/auth/ws-token');
      if (!res.ok) return null;
      const data = await res.json();
      return typeof data.token === 'string' ? data.token : null;
    } catch {
      return null;
    }
  }, []);

  const onContentChangeRef = useRef(onContentChange);
  const onOperationRef = useRef(onOperation);
  const updateMetricsRef = useRef(updateMetrics);
  const getTokenRef = useRef(getToken);
  const rgaRef = useRef(rga);

  useEffect(() => {
    onContentChangeRef.current = onContentChange;
    onOperationRef.current = onOperation;
    updateMetricsRef.current = updateMetrics;
    getTokenRef.current = getToken;
    rgaRef.current = rga;
  });

  // Auto-resize textarea height to accommodate long content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(450, textareaRef.current.scrollHeight)}px`;
    }
  }, [text, mode]);

  // SyncClient connection setup - ONLY connects if user is joined with a valid display name
  useEffect(() => {
    if (!siteId || !isJoined || !activeUserName) return;

    const wsUrl = getWebSocketUrl(propServerUrl);

    const client = new SyncClient({
      serverUrl: wsUrl,
      docId: documentId,
      siteId,
      name: activeUserName,
      color: userColor,
      userId,
      sessionId,
      token: wsToken,
      getToken: () => getTokenRef.current(),
      autoConnect: true,
      onRemoteOp: (op: Op) => {
        client.applyRemoteOp(rgaRef.current, op);
        updateMetricsRef.current();
        onContentChangeRef.current?.(rgaRef.current.getText());
      },
      onSyncComplete: (history: readonly Op[]) => {
        client.applyHistory(rgaRef.current, history);
        updateMetricsRef.current();
        onContentChangeRef.current?.(rgaRef.current.getText());
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
  }, [
    documentId,
    siteId,
    isJoined,
    activeUserName,
    userColor,
    propServerUrl,
    userId,
    sessionId,
    wsToken,
  ]);

  /**
   * Applies changes from new text to the underlying RGA CRDT.
   * Calculates character deltas and broadcasts ops through SyncClient.
   */
  const applyTextChange = useCallback(
    (newText: string) => {
      if (!siteId || !isJoined || isReadOnly) return;
      const currentRga = rgaRef.current;
      const oldText = currentRga.getText();
      if (newText === oldText) return;

      // 1. Calculate common prefix
      let prefix = 0;
      while (
        prefix < oldText.length &&
        prefix < newText.length &&
        oldText[prefix] === newText[prefix]
      ) {
        prefix++;
      }

      // 2. Calculate common suffix
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

      // Apply deletes
      for (let i = 0; i < deleteCount; i++) {
        const targetId = currentRga.idAtVisibleOffset(prefix + 1);
        if (targetId) {
          const op = currentRga.localDelete(targetId);
          syncClientRef.current?.sendOperation(op);
          onOperationRef.current?.(op);
        }
      }

      // Apply inserts
      for (let i = 0; i < insertText.length; i++) {
        const char = insertText[i];
        const afterId = prefix + i === 0 ? null : currentRga.idAtVisibleOffset(prefix + i);
        const op = currentRga.localInsert(afterId, char);
        syncClientRef.current?.sendOperation(op);
        onOperationRef.current?.(op);
      }

      updateMetricsRef.current();
      onContentChangeRef.current?.(newText);
    },
    [siteId, isJoined, isReadOnly]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Tab key support for indentation in Code Mode
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const val = target.value;
      const newVal = val.substring(0, start) + '  ' + val.substring(end);
      applyTextChange(newVal);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
      return;
    }

    // Auto-indent on Enter in Code Mode
    if (mode === 'code' && e.key === 'Enter' && !e.shiftKey) {
      const target = e.currentTarget;
      const start = target.selectionStart;
      const val = target.value;
      const curLine = val.substring(0, start).split('\n').pop() || '';
      const match = curLine.match(/^(\s+)/);
      if (match) {
        e.preventDefault();
        const indent = match[1];
        const newVal = val.substring(0, start) + '\n' + indent + val.substring(start);
        applyTextChange(newVal);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 1 + indent.length;
          }
        }, 0);
        return;
      }
    }
  };

  const handleCopyCode = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
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
      const url = `${window.location.origin}/${encodeURIComponent(documentId)}`;
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
      <div className="flex flex-col items-center justify-center min-h-screen w-full p-4 bg-[#0a0a0a] text-[#ededed]">
        <div className="w-full max-w-sm rounded-2xl bg-neutral-900/90 border border-neutral-800 p-8 shadow-2xl flex flex-col gap-6 animate-fade-in">
          <div className="flex flex-col items-center text-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200 flex items-center justify-center mb-1">
              <Icons.Logo size={16} />
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-neutral-950 border border-neutral-800 text-[11px] font-mono text-neutral-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Collaborative Session</span>
            </div>
            <h2 className="text-lg font-semibold tracking-tight text-neutral-200 mt-1">Join Room</h2>
            <div className="flex items-center justify-center gap-1.5 text-xs text-neutral-500">
              <span className="text-neutral-300 font-medium">{roomName}</span>
              <span>•</span>
              <span className="font-mono text-neutral-400">{documentId}</span>
            </div>
          </div>

          <form onSubmit={handleJoinGateSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="join-gate-name" className="text-xs text-neutral-400">
                Your Name
              </label>
              <input
                id="join-gate-name"
                type="text"
                placeholder="e.g. Alice"
                value={gateInputName}
                onChange={(e) => {
                  setGateInputName(e.target.value);
                  if (gateError) setGateError(undefined);
                }}
                autoFocus
                className={`w-full px-3.5 py-2.5 rounded-lg bg-neutral-950 border text-sm text-neutral-200 placeholder-neutral-600 outline-none transition-colors ${
                  gateError
                    ? 'border-rose-500/80 focus:border-rose-500'
                    : 'border-neutral-800 focus:border-neutral-600'
                }`}
              />
              {gateError && (
                <p className="text-xs text-rose-400 font-medium">{gateError}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-neutral-200 hover:bg-white text-neutral-950 text-xs font-medium transition-all active:scale-[0.99] flex items-center justify-center gap-1.5 mt-1 cursor-pointer"
            >
              <span>Join Document</span>
              <Icons.ArrowRight size={12} />
            </button>
          </form>

          <div className="text-center pt-2 border-t border-neutral-800">
            <Link href="/" className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors inline-flex items-center gap-1">
              <Icons.ArrowLeft size={11} />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const totalCollaborators = peers.length + 1;
  const lineCount = Math.max(1, text.split('\n').length);

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#0a0a0a] text-[#ededed] selection:bg-neutral-800 selection:text-neutral-200">
      {/* Top Workspace Navigation Bar - Subtle & In Corners */}
      <header className="sticky top-0 z-30 px-4 sm:px-6 h-12 flex items-center justify-between border-b border-neutral-900/80 bg-[#0a0a0a]/80 backdrop-blur-md select-none">
        {/* Left: Branding, Room Name & Room ID, Auth Details */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-medium text-neutral-400 hover:text-neutral-200 transition-colors shrink-0"
            title="Back to Home"
          >
            <div className="w-5 h-5 rounded bg-neutral-900 border border-neutral-800 text-neutral-200 flex items-center justify-center">
              <Icons.Logo size={11} />
            </div>
            <span className="font-semibold text-neutral-200">Braid</span>
          </Link>

          <span className="text-neutral-700 text-xs">/</span>

          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium text-xs sm:text-sm text-neutral-300 font-mono truncate max-w-[130px] sm:max-w-xs">
              {roomName}
            </span>
            <button
              type="button"
              onClick={handleCopyId}
              className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 px-2 py-0.5 rounded text-[11px] font-mono text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer shrink-0"
              title="Copy Room ID"
            >
              <span>{documentId}</span>
              {copyFeedback === 'id' ? <Icons.Check size={10} className="text-emerald-400" /> : <Icons.Copy size={10} />}
            </button>
          </div>

          {/* Auth Login Detail & Name in Left Header Corner */}
          <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-neutral-800">
            {userId && !userId.startsWith('guest-') ? (
              <div className="flex items-center gap-1.5 text-xs text-neutral-300">
                <Avatar name={activeUserName} size="xs" />
                <span className="font-medium text-[11px] truncate max-w-[100px]">{activeUserName}</span>
                <button
                  type="button"
                  onClick={handleOpenEditName}
                  className="text-[10px] text-neutral-400 hover:text-neutral-200 ml-0.5 cursor-pointer flex items-center gap-0.5"
                  title="Change display name"
                >
                  <Icons.Edit size={10} />
                  <span>Edit</span>
                </button>
                <span className="text-neutral-700">|</span>
                <Link href="/dashboard" className="text-[10px] text-neutral-400 hover:text-neutral-200">Dashboard</Link>
                <span className="text-neutral-700">|</span>
                <button
                  type="button"
                  onClick={async () => {
                    await fetch('/api/auth/logout', { method: 'POST' });
                    window.location.reload();
                  }}
                  className="text-[10px] text-neutral-400 hover:text-rose-400 cursor-pointer flex items-center gap-0.5"
                  title="Log Out"
                >
                  <Icons.LogOut size={10} />
                  <span>Log out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleOpenEditName}
                  className="text-[11px] font-medium px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                  title="Change your display name"
                >
                  <Icons.Edit size={10} />
                  <span>Edit Name</span>
                </button>
                <Link
                  href={`/login?from=/${encodeURIComponent(documentId)}`}
                  className="text-[11px] font-medium px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white transition-all flex items-center gap-1"
                >
                  <Icons.LogIn size={11} />
                  <span>Log In</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Center: Clean Mode Switcher (Text vs Code) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg bg-neutral-900 border border-neutral-800 p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setMode('text')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                mode === 'text'
                  ? 'bg-neutral-800 text-neutral-100 shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <span>Text</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('code')}
              className={`px-3 py-1 rounded-md font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                mode === 'code'
                  ? 'bg-neutral-800 text-neutral-100 shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <span>&lt;/&gt; Code</span>
            </button>
          </div>

          {/* Language Selector when in Code mode */}
          {mode === 'code' && (
            <select
              value={codeLanguage}
              onChange={(e) => setCodeLanguage(e.target.value)}
              className="bg-neutral-900 text-neutral-200 text-xs font-mono rounded-lg px-2.5 py-1 border border-neutral-800 outline-none hover:border-neutral-700 cursor-pointer transition-colors"
            >
              {CODE_LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value} className="bg-neutral-900 text-neutral-200">
                  {lang.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Right: Autosave Status, Collaborators & Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Status Pill */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-neutral-900/90 border border-neutral-800 text-[11px] font-mono">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                saveStatus === 'saved' || (!saveStatus && connectionStatus === 'connected')
                  ? 'bg-emerald-500'
                  : saveStatus === 'saving' || connectionStatus === 'connecting' || connectionStatus === 'reconnecting'
                  ? 'bg-amber-500 animate-pulse'
                  : saveStatus === 'offline' || connectionStatus === 'offline'
                  ? 'bg-amber-600'
                  : 'bg-rose-500'
              }`}
            />
            <span className="text-neutral-400">
              {saveStatus === 'saving'
                ? 'Saving...'
                : saveStatus === 'offline'
                ? 'Offline'
                : saveStatus === 'error'
                ? 'Save failed'
                : saveStatus === 'saved'
                ? 'Saved'
                : connectionStatus === 'connected'
                ? 'Synced'
                : connectionStatus === 'connecting'
                ? 'Connecting...'
                : connectionStatus === 'reconnecting'
                ? 'Reconnecting...'
                : connectionStatus === 'error'
                ? 'Sync Error'
                : 'Offline'}
            </span>
          </div>

          {/* Collaborator Count & Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPeersDropdown((prev) => !prev)}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-[11px] font-mono text-neutral-300 transition-colors cursor-pointer"
              title="View Active Collaborators"
            >
              <Icons.Users size={11} className="text-neutral-400" />
              <span>{totalCollaborators}</span>
            </button>

            {/* Collaborators Dropdown Menu */}
            {showPeersDropdown && (
              <div className="absolute right-0 top-full mt-1.5 w-56 p-2 rounded-xl bg-neutral-900 border border-neutral-800 shadow-2xl z-40 flex flex-col gap-1 text-xs text-neutral-200 animate-slide-down">
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 px-2 py-1">
                  Active in Room ({totalCollaborators})
                </div>
                <div className="flex flex-col gap-1">
                  {/* Current User */}
                  <div className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-neutral-950/80">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-black shrink-0"
                        style={{ backgroundColor: userColor }}
                      >
                        {activeUserName.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-medium truncate text-neutral-200">{activeUserName} (you)</span>
                        <span className="text-[10px] font-mono text-neutral-500">{siteId}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPeersDropdown(false);
                        handleOpenEditName();
                      }}
                      className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                      title="Edit display name"
                    >
                      <Icons.Edit size={11} />
                      <span className="text-[10px]">Edit</span>
                    </button>
                  </div>

                  {/* Remote Peers */}
                  {peers.map((peer) => (
                    <div key={peer.siteId} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-neutral-800/60">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-black shrink-0"
                        style={{ backgroundColor: peer.color || '#F5C6B0' }}
                      >
                        {(peer.name || peer.siteId).slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-medium truncate text-neutral-200">{peer.name || peer.siteId}</span>
                        <span className="text-[10px] font-mono text-neutral-500">{peer.siteId}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Current User Pill with Edit Action */}
          <button
            type="button"
            onClick={handleOpenEditName}
            className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-[11px] font-mono text-neutral-300 hover:text-white transition-colors cursor-pointer group"
            title={`You (${siteId || 'init'})`}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: userColor }} />
            <span className="truncate max-w-[90px]">{activeUserName}</span>
            <Icons.Edit size={10} className="text-neutral-500 group-hover:text-neutral-300 ml-0.5" />
          </button>

          {/* Export Dropdown */}
          <ExportDropdown
            projectId={documentId}
            documentTitle={roomName}
            getContent={() => rgaRef.current.getText()}
            onFlushSave={onFlushSave}
            size="sm"
          />

          {/* Share Link Button */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="text-xs font-medium px-2.5 py-1 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors flex items-center gap-1 cursor-pointer"
            title="Share Link"
          >
            <Icons.Share size={11} />
            <span>{copyFeedback === 'link' ? 'Copied!' : 'Share Link'}</span>
          </button>
        </div>
      </header>

      {/* Offline Warning Banner */}
      {connectionStatus === 'offline' && (
        <div className="px-6 py-2 bg-amber-950/40 border-b border-amber-900/60 text-xs font-medium text-amber-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>You are offline. Edits are saved locally and will synchronize when your network returns.</span>
          </div>
          {pendingOpsCount > 0 && (
            <span className="font-semibold bg-amber-900/60 px-2 py-0.5 rounded text-[11px] font-mono">
              {pendingOpsCount} queued
            </span>
          )}
        </div>
      )}

      {/* Reconnecting Banner */}
      {connectionStatus === 'reconnecting' && (
        <div className="px-6 py-2 bg-blue-950/40 border-b border-blue-900/60 text-xs font-medium text-blue-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icons.Spinner size={12} className="animate-spin text-blue-400" />
            <span>Reconnecting to Braid sync server...</span>
          </div>
          {pendingOpsCount > 0 && (
            <span className="font-semibold bg-blue-900/60 px-2 py-0.5 rounded text-[11px] font-mono">
              {pendingOpsCount} queued
            </span>
          )}
        </div>
      )}

      {/* Error Banner */}
      {connectionStatus === 'error' && (
        <div className="px-6 py-2 bg-rose-950/40 border-b border-rose-900/60 text-xs font-medium text-rose-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icons.AlertCircle size={13} className="text-rose-400" />
            <span>Connection to Sync Server failed.</span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (syncClientRef.current) {
                syncClientRef.current.connect();
              }
            }}
            className="px-2 py-0.5 rounded bg-rose-900/60 hover:bg-rose-800 text-rose-200 text-xs font-medium cursor-pointer transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Full-Screen Unified Editor Canvas */}
      <div className="flex-1 flex flex-col w-full relative">
        <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-8 py-8 sm:py-10 flex flex-col gap-3 border-l border-neutral-800/80 min-h-[calc(100vh-6.5rem)]">
          {/* Active Mode Header Details */}
          <div className="flex items-center justify-between pb-2 border-b border-neutral-900/80 select-none text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-neutral-500">Mode:</span>
              <span className="text-xs font-semibold text-neutral-300 font-mono">
                {mode === 'text' ? 'Plain Text Editor' : `Code Editor (${codeLanguage.toUpperCase()})`}
              </span>
            </div>

            {mode === 'code' && (
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-2.5 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-[11px] font-mono text-neutral-300 border border-neutral-800 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>{copiedCode ? '✓ Copied' : 'Copy All Code'}</span>
              </button>
            )}
          </div>

          {/* Unified Editor Surface (Whole Editor for Text or Code) */}
          <div className="flex-1 flex items-start gap-3 w-full">
            {/* Line numbers gutter in Code mode */}
            {mode === 'code' && (
              <div className="flex flex-col text-right font-mono text-xs text-neutral-600 select-none py-2 pr-2 border-r border-neutral-850 min-w-[2.5rem]">
                {Array.from({ length: lineCount }).map((_, i) => (
                  <div key={i} className="leading-6">
                    {i + 1}
                  </div>
                ))}
              </div>
            )}

            {/* Continuous Full-Screen Textarea */}
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => applyTextChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                mode === 'code'
                  ? `// Write ${codeLanguage.toUpperCase()} code here...\n// Real-time synchronization active.`
                  : 'Write your document text here...\nEverything is synchronized in real time without conflicts.'
              }
              className={`flex-1 w-full bg-transparent outline-none resize-none leading-6 ${
                mode === 'code'
                  ? 'font-mono text-xs sm:text-sm text-neutral-100 placeholder-neutral-700 font-normal'
                  : 'font-sans text-sm sm:text-base text-neutral-200 placeholder-neutral-700 font-normal'
              }`}
              spellCheck={mode === 'text'}
              autoFocus
            />
          </div>
        </main>
      </div>

      {/* Subtle Bottom Diagnostics Bar */}
      <footer className="px-6 py-2 border-t border-neutral-900 text-[10px] text-neutral-600 font-mono select-none flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>{lineCount} lines</span>
          <span>•</span>
          <span>{text.length} chars</span>
          <span>•</span>
          <span>{rga.getNodes().length} CRDT nodes</span>
          <span>•</span>
          <span>{tombstoneCount} tombstones</span>
        </div>
        <div>
          Site: {siteId || 'init'}
        </div>
      </footer>

      {/* Edit Display Name Modal */}
      <Modal
        isOpen={isEditingName}
        onClose={() => setIsEditingName(false)}
        title="Edit Display Name"
        description="Choose how your name appears to other collaborators in this room."
        maxWidth="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveName(nameInput);
          }}
          className="flex flex-col gap-4 mt-2"
        >
          <Input
            label="Your Name"
            placeholder="e.g. Alice, Bob"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            autoFocus
          />
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
            <button
              type="button"
              onClick={() => setIsEditingName(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!nameInput.trim()}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-neutral-100 hover:bg-white text-neutral-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Save Name
            </button>
          </div>
        </form>
      </Modal>

      {/* Floating Previous Documents Sidebar in Bottom-Right Corner */}
      <PreviousDocumentsSidebar />
    </div>
  );
};
