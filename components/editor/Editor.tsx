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
import { ThemeToggle } from '../ui/theme-toggle';
import { ShareModal } from '../ui/share-modal';
import { PreviousDocumentsSidebar } from '../layout/PreviousDocumentsSidebar';
import { parseDocument, parseInlineFormatting, type BlockType } from '../../lib/document-model';
import { TechnicalLabel } from '../design';

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

function InlinePreviewText({ content }: { content: string }) {
  return <>{parseInlineFormatting(content).map((span, index) => {
    let child: React.ReactNode = span.text;
    if (span.code) child = <code className="rounded bg-[var(--surface-muted)] px-1 py-0.5 font-mono text-[0.9em]">{child}</code>;
    if (span.bold) child = <strong>{child}</strong>;
    if (span.italic) child = <em>{child}</em>;
    if (span.underline) child = <u>{child}</u>;
    if (span.strikethrough) child = <s>{child}</s>;
    if (span.link && /^(https?:|mailto:|#)/i.test(span.link)) {
      child = <a href={span.link} className="text-[var(--accent)] underline underline-offset-2" target={span.link.startsWith('#') ? undefined : '_blank'} rel={span.link.startsWith('#') ? undefined : 'noreferrer'}>{child}</a>;
    }
    return <React.Fragment key={index}>{child}</React.Fragment>;
  })}</>;
}

function DocumentPreview({ content }: { content: string }) {
  const blocks = parseDocument(content).blocks;
  const output: React.ReactNode[] = [];

  for (let index = 0; index < blocks.length; index++) {
    const block = blocks[index];
    if (block.type === 'bulleted_list' || block.type === 'numbered_list') {
      const listType = block.type;
      const items: typeof blocks = [];
      while (index < blocks.length && blocks[index].type === listType) {
        items.push(blocks[index]);
        index++;
      }
      index--;
      const List = listType === 'bulleted_list' ? 'ul' : 'ol';
      output.push(<List key={block.id} className={`my-3 space-y-1.5 pl-6 ${listType === 'bulleted_list' ? 'list-disc' : 'list-decimal'}`}>
        {items.map((item) => <li key={item.id} className="pl-1"><InlinePreviewText content={item.content} /></li>)}
      </List>);
      continue;
    }

    switch (block.type) {
      case 'heading1':
        output.push(<h1 key={block.id} className="mb-5 mt-8 text-3xl font-bold tracking-tight first:mt-0 sm:text-4xl"><InlinePreviewText content={block.content} /></h1>);
        break;
      case 'heading2':
        output.push(<h2 key={block.id} className="mb-3 mt-7 text-2xl font-semibold tracking-tight"><InlinePreviewText content={block.content} /></h2>);
        break;
      case 'heading3':
        output.push(<h3 key={block.id} className="mb-2 mt-6 text-xl font-semibold"><InlinePreviewText content={block.content} /></h3>);
        break;
      case 'todo':
        output.push(<div key={block.id} className="my-2 flex gap-2"><span aria-hidden="true" className={block.checked ? 'text-[var(--success)]' : 'text-[var(--text-subtle)]'}>{block.checked ? '☑' : '□'}</span><span className={block.checked ? 'text-[var(--text-muted)] line-through' : ''}><InlinePreviewText content={block.content} /></span></div>);
        break;
      case 'quote':
        output.push(<blockquote key={block.id} className="my-4 border-l-2 border-[var(--border-strong)] pl-4 italic text-[var(--text-muted)]"><InlinePreviewText content={block.content} /></blockquote>);
        break;
      case 'callout': {
        const accent = block.calloutVariant === 'warning' ? 'var(--warning)' : block.calloutVariant === 'success' ? 'var(--success)' : block.calloutVariant === 'info' ? '#3b82f6' : 'var(--accent)';
        output.push(<aside key={block.id} className="my-4 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3" style={{ borderLeft: `3px solid ${accent}` }}><InlinePreviewText content={block.content} /></aside>);
        break;
      }
      case 'code':
        output.push(<pre key={block.id} className="my-4 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-sm leading-6"><code className="font-mono">{block.content}</code></pre>);
        break;
      case 'divider':
        output.push(<hr key={block.id} className="my-7 border-[var(--border)]" />);
        break;
      default:
        output.push(<p key={block.id} className="my-3 whitespace-pre-wrap leading-7"><InlinePreviewText content={block.content} /></p>);
    }
  }

  return <article className="mx-auto w-full max-w-3xl min-h-[450px] py-2 text-[var(--text)]" aria-label="Document preview">{output}</article>;
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

  const syncClientRef = useRef<SyncClient | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
  const [selectedBlockType, setSelectedBlockType] = useState<BlockType>(
    () => parseDocument(initialContent).blocks[0]?.type ?? 'paragraph'
  );
  const [isPreview, setIsPreview] = useState(false);

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
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

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
        if (client) {
          setPendingOpsCount(client.pendingOutgoingCount);
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

  // Apply starter template if stored in sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
      try {
        const storedTemplate = sessionStorage.getItem(`braid:template:${documentId}`);
        if (storedTemplate && (!initialContent || initialContent.trim() === '')) {
          sessionStorage.removeItem(`braid:template:${documentId}`);
          applyTextChange(storedTemplate);
        }
      } catch {}
    }
  }, [documentId, initialContent, applyTextChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && mode === 'text') {
      const shortcut = e.key.toLowerCase();
      const inlineFormats: Record<string, [string, string]> = {
        b: ['**', '**'], i: ['*', '*'], u: ['<u>', '</u>'],
      };
      if (inlineFormats[shortcut]) {
        e.preventDefault();
        applyInlineFormat(...inlineFormats[shortcut]);
        return;
      }
    }
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

  const applyInlineFormat = useCallback((prefix: string, suffix = prefix) => {
    const input = textareaRef.current;
    if (!input || mode !== 'text' || isReadOnly) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selected = text.slice(start, end);
    const next = `${text.slice(0, start)}${prefix}${selected}${suffix}${text.slice(end)}`;
    applyTextChange(next);
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start + prefix.length, end + prefix.length);
    });
  }, [applyTextChange, isReadOnly, mode, text]);

  const applyBlockFormat = useCallback((type: BlockType) => {
    const input = textareaRef.current;
    if (!input || mode !== 'text' || isReadOnly) return;
    const start = input.selectionStart;
    const lineStart = text.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
    const lineEndAt = text.indexOf('\n', start);
    const lineEnd = lineEndAt < 0 ? text.length : lineEndAt;
    const line = text.slice(lineStart, lineEnd);
    const block = parseDocument(line).blocks[0];
    const body = block?.content ?? line;
    const prefix: Record<BlockType, string> = {
      paragraph: '', heading1: '# ', heading2: '## ', heading3: '### ',
      bulleted_list: '- ', numbered_list: '1. ', todo: '- [ ] ',
      quote: '> ', callout: '> 💡 ', code: '```\n', divider: '---',
    };
    let replacement = `${prefix[type]}${body}`;
    if (type === 'code') replacement += '\n```';
    if (block?.type === type) return;
    if (type === 'divider') replacement = '---';
    setSelectedBlockType(type);
    const next = `${text.slice(0, lineStart)}${replacement}${text.slice(lineEnd)}`;
    applyTextChange(next);
    requestAnimationFrame(() => {
      input.focus();
      const caret = lineStart + Math.min(replacement.length, start - lineStart + replacement.length - line.length);
      input.setSelectionRange(caret, caret);
    });
  }, [applyTextChange, isReadOnly, mode, text]);

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

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Keyboard shortcut: Escape to close mobile menu
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isMobileMenuOpen]);

  const totalCollaborators = peers.length + 1;
  const lineCount = Math.max(1, text.split('\n').length);
  const wordCount = useMemo(() => {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }, [text]);
  const readingTimeMins = useMemo(() => {
    return Math.max(1, Math.ceil(wordCount / 200));
  }, [wordCount]);

  // If user is not yet joined (direct room URL without prior identity), show Join Room gate
  if (!isJoined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen w-full p-4 bg-[var(--background)] text-[var(--text)] transition-colors">
        <div className="w-full max-w-sm rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-8 shadow-modal flex flex-col gap-6 animate-fade-in transition-colors">
          <div className="flex flex-col items-center text-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--text)] flex items-center justify-center mb-1 shadow-xs">
              <Icons.Logo size={16} />
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--surface-muted)] border border-[var(--border)] text-[11px] font-mono text-[var(--text-subtle)]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Collaborative Session</span>
            </div>
            <h2 className="text-lg font-semibold tracking-tight text-[var(--text)] mt-1">Join Room</h2>
            <div className="flex items-center justify-center gap-1.5 text-xs text-[var(--text-muted)]">
              <span className="text-[var(--text)] font-medium">{roomName}</span>
              <span>•</span>
              <span className="font-mono text-[var(--text-subtle)]">{documentId}</span>
            </div>
          </div>

          <form onSubmit={handleJoinGateSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="join-gate-name" className="text-xs text-[var(--text-muted)]">
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
                className={`w-full px-3.5 py-2.5 rounded-lg bg-[var(--surface-muted)] text-[var(--text)] placeholder-[var(--text-subtle)] border text-sm outline-none transition-colors focus:bg-[var(--surface)] ${
                  gateError
                    ? 'border-rose-500/80 focus:border-rose-500'
                    : 'border-[var(--border)] focus:border-[var(--border-strong)]'
                }`}
              />
              {gateError && (
                <p className="text-xs text-rose-400 font-medium">{gateError}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold transition-all active:scale-[0.99] flex items-center justify-center gap-1.5 mt-1 cursor-pointer shadow-xs"
            >
              <span>Join Document</span>
              <Icons.ArrowRight size={12} />
            </button>
          </form>

          <div className="text-center pt-2 border-t border-[var(--border)]">
            <Link href="/" className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors inline-flex items-center gap-1">
              <Icons.ArrowLeft size={11} />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen w-full bg-[var(--background)] text-[var(--text)] selection:bg-[var(--surface-hover)] selection:text-[var(--text)] transition-colors">
      {/* Top Workspace Navigation Bar */}
      <header className="sticky top-0 z-30 px-3 sm:px-6 h-12 flex items-center justify-between border-b border-[var(--line)] bg-[var(--paper)] select-none transition-colors gap-2 sm:gap-3">
        {/* Mobile Left: Sidebar opening button + Room ID */}
        <div className="flex sm:hidden items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open document sidebar menu"
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text)] transition-colors cursor-pointer active:scale-95 shrink-0"
            title="Open Document Sidebar"
          >
            <Icons.Menu size={16} />
          </button>

          <span className="font-semibold text-xs text-[var(--text)] font-mono truncate max-w-[160px]">
            {documentId}
          </span>
        </div>

        {/* Desktop Left: Branding, Room Name & Room ID, Auth Details */}
        <div className="hidden sm:flex items-center gap-2.5 min-w-0">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)] transition-colors shrink-0"
            title="Back to Home"
          >
            <div className="w-5 h-5 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--text)] flex items-center justify-center">
              <Icons.Logo size={11} />
            </div>
            <span className="font-semibold text-[var(--text)]">Braid</span>
          </Link>

          <span className="text-[var(--text-subtle)] text-xs">/</span>

          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-medium text-sm text-[var(--text)] font-mono truncate max-w-xs">
              {roomName}
            </span>
            <button
              type="button"
              onClick={handleCopyId}
              className="flex items-center gap-1 bg-[var(--surface-muted)] border border-[var(--border)] hover:border-[var(--border-strong)] px-2 py-0.5 rounded-md text-[11px] font-mono text-[var(--text-subtle)] hover:text-[var(--text)] transition-colors cursor-pointer shrink-0"
              title="Copy Room ID"
            >
              <span>{documentId}</span>
              {copyFeedback === 'id' ? <Icons.Check size={10} className="text-emerald-400" /> : <Icons.Copy size={10} />}
            </button>
          </div>

          {/* Auth Login Detail & Name in Left Header Corner */}
          <div className="hidden items-center gap-2 pl-2 border-l border-[var(--border)]">
            {userId && !userId.startsWith('guest-') ? (
              <div className="flex items-center gap-1.5 text-xs text-[var(--text)]">
                <Avatar name={activeUserName} size="xs" />
                <span className="font-medium text-[11px] truncate max-w-[100px]">{activeUserName}</span>
                <span className="text-[var(--text-subtle)]">|</span>
                <Link href="/dashboard" className="text-[10px] text-[var(--text-subtle)] hover:text-[var(--text)]">Dashboard</Link>
                <span className="text-[var(--text-subtle)]">|</span>
                <button
                  type="button"
                  onClick={async () => {
                    await fetch('/api/auth/logout', { method: 'POST' });
                    window.location.reload();
                  }}
                  className="text-[10px] text-[var(--text-subtle)] hover:text-rose-400 cursor-pointer flex items-center gap-0.5"
                  title="Log Out"
                >
                  <Icons.LogOut size={10} />
                  <span>Log out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Link
                  href={`/login?from=/${encodeURIComponent(documentId)}`}
                  className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[var(--surface-muted)] border border-[var(--border)] hover:border-[var(--border-strong)] text-[var(--text)] transition-all flex items-center gap-1"
                >
                  <Icons.LogIn size={11} />
                  <span>Log In</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Center: Desktop Segmented Mode Switcher */}
        <div className="hidden sm:flex items-center gap-2">
          <div className="flex items-center rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setMode('text')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                mode === 'text'
                  ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs font-semibold'
                  : 'text-[var(--text-subtle)] hover:text-[var(--text)]'
              }`}
            >
              <span>Text</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('code')}
              className={`px-3 py-1 rounded-md font-mono transition-all cursor-pointer flex items-center gap-1 ${
                mode === 'code'
                  ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs font-semibold'
                  : 'text-[var(--text-subtle)] hover:text-[var(--text)]'
              }`}
            >
              <span>&lt;/&gt; Code</span>
            </button>
          </div>

          {/* Language Selector when in Code mode on desktop */}
          {mode === 'code' && (
            <select
              value={codeLanguage}
              onChange={(e) => setCodeLanguage(e.target.value)}
              className="bg-[var(--surface-muted)] text-[var(--text)] text-xs font-mono rounded-lg px-2.5 py-1 border border-[var(--border)] outline-none hover:border-[var(--border-strong)] cursor-pointer transition-colors"
            >
              {CODE_LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value} className="bg-[var(--surface)] text-[var(--text)]">
                  {lang.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Mobile Right: Theme Toggler */}
        <div className="flex sm:hidden items-center gap-1 shrink-0">
          <ExportDropdown
            projectId={documentId}
            documentTitle={roomName}
            getContent={() => rgaRef.current.getText()}
            onFlushSave={onFlushSave}
            size="sm"
          />
          <ThemeToggle />
        </div>

        {/* Desktop Right: Tools & Actions */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Status Pill */}
          <div
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--surface-muted)] border border-[var(--border)] text-[11px] font-mono"
            title={
              saveStatus === 'saving'
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
                : 'Offline'
            }
          >
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
            <span className="text-[var(--text-subtle)]">
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
          <div className="hidden">
            <button
              type="button"
              onClick={() => setShowPeersDropdown((prev) => !prev)}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--surface-muted)] border border-[var(--border)] hover:border-[var(--border-strong)] text-[11px] font-mono text-[var(--text)] transition-colors cursor-pointer"
              title="View Active Collaborators"
            >
              <Icons.Users size={11} className="text-[var(--text-subtle)]" />
              <span>{totalCollaborators}</span>
            </button>

            {/* Collaborators Dropdown Menu */}
            {showPeersDropdown && (
              <div className="absolute right-0 top-full mt-1.5 w-56 max-w-[calc(100vw-1.5rem)] p-2 rounded-2xl bg-[var(--surface)] border border-[var(--border-strong)] shadow-modal z-40 flex flex-col gap-1 text-xs text-[var(--text)] animate-slide-down">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-subtle)] px-2 py-1">
                  Active in Room ({totalCollaborators})
                </div>
                <div className="flex flex-col gap-1">
                  {/* Current User */}
                  <div className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-[var(--surface-muted)]">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-black shrink-0"
                        style={{ backgroundColor: userColor }}
                      >
                        {activeUserName.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-medium truncate text-[var(--text)]">{activeUserName} (you)</span>
                        <span className="text-[10px] font-mono text-[var(--text-subtle)]">{siteId}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPeersDropdown(false);
                        handleOpenEditName();
                      }}
                      className="p-1 text-[var(--text-subtle)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] rounded-md text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                      title="Edit display name"
                    >
                      <Icons.Edit size={11} />
                      <span className="text-[10px]">Edit</span>
                    </button>
                  </div>

                  {/* Remote Peers */}
                  {peers.map((peer) => (
                    <div key={peer.siteId} className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-[var(--surface-muted)]">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-black shrink-0"
                        style={{ backgroundColor: peer.color || '#F5C6B0' }}
                      >
                        {(peer.name || peer.siteId).slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-medium truncate text-[var(--text)]">{peer.name || peer.siteId}</span>
                        <span className="text-[10px] font-mono text-[var(--text-subtle)]">{peer.siteId}</span>
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
            className="hidden"
            title={`You (${siteId || 'init'})`}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: userColor }} />
            <span className="truncate max-w-[90px]">{activeUserName}</span>
            <Icons.Edit size={10} className="text-[var(--text-subtle)] group-hover:text-[var(--text)] ml-0.5" />
          </button>

          {/* Export Dropdown */}
          <ExportDropdown
            projectId={documentId}
            documentTitle={roomName}
            getContent={() => rgaRef.current.getText()}
            onFlushSave={onFlushSave}
            size="sm"
          />

          {/* Share Room Button (Opens QR Code & Direct Link Modal) */}
          <button
            type="button"
            onClick={() => setIsShareModalOpen(true)}
            className="text-xs font-medium px-2.5 py-1 rounded-lg bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text)] transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
            title="Share Room (QR Code & Direct Link)"
          >
            <Icons.Share size={11} />
            <span>Share</span>
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
      <div className="grid flex-1 grid-cols-1 xl:grid-cols-[220px_minmax(0,1fr)_250px]">
        <aside className="hidden border-r border-[var(--line)] px-4 py-7 xl:block">
          <div className="sticky top-20 flex flex-col gap-8">
            <section>
              <div className="mb-3 font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--muted)]">01 / Workspace</div>
              <Link href="/dashboard" className="flex items-center gap-2 border-y border-[var(--line)] py-3 text-xs hover:text-[var(--accent)]"><Icons.Folder size={13} /><span>All documents</span></Link>
              <div className="mt-5 font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--muted)]">02 / Recent</div>
              <div className="mt-2 border-y border-[var(--accent)] bg-[var(--accent-subtle)] px-2.5 py-3">
                <span className="block truncate text-xs font-medium">{roomName}</span>
                <span className="mt-1 block truncate font-mono text-[9px] text-[var(--muted)]">{documentId}</span>
              </div>
              <button type="button" onClick={() => setIsMobileMenuOpen(true)} className="mt-3 flex items-center gap-2 font-mono text-[9px] uppercase tracking-wider text-[var(--muted)] hover:text-[var(--ink)]"><Icons.Menu size={12} /> Previous documents</button>
            </section>
            <section className="border-t border-[var(--line)] pt-4">
              <div className="mb-3 font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--muted)]">03 / Document</div>
              <button type="button" onClick={handleCopyLink} className="flex w-full items-center gap-2 py-2 text-left text-xs text-[var(--muted)] hover:text-[var(--ink)]"><Icons.Copy size={12} /> Copy room link</button>
              <button type="button" onClick={() => setIsShareModalOpen(true)} className="flex w-full items-center gap-2 py-2 text-left text-xs text-[var(--muted)] hover:text-[var(--ink)]"><Icons.Share size={12} /> Share room</button>
            </section>
          </div>
        </aside>

        <main className="flex min-w-0 flex-col gap-3 px-3 py-3 sm:px-6 sm:py-4 xl:px-10">
          {mode === 'text' && (
            <div className="sticky top-12 z-10 -mx-1 sm:mx-0 flex flex-wrap items-center gap-1.5 border-y border-[var(--line)] bg-[var(--paper)] p-2" aria-label="Text formatting">
              <div className="mr-1 flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-0.5">
                <button
                  type="button"
                  onClick={() => setIsPreview(false)}
                  aria-pressed={!isPreview}
                  className={`h-7 rounded-md px-2.5 text-xs font-medium ${!isPreview ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}
                >Edit</button>
                <button
                  type="button"
                  onClick={() => setIsPreview(true)}
                  aria-pressed={isPreview}
                  className={`h-7 rounded-md px-2.5 text-xs font-medium ${isPreview ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}
                >Preview</button>
              </div>
              {!isPreview && <>
              <label className="sr-only" htmlFor="block-format">Text style</label>
              <select
                id="block-format"
                value={selectedBlockType}
                onChange={(e) => applyBlockFormat(e.target.value as BlockType)}
                className="h-8 max-w-[150px] rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-2 text-xs font-medium text-[var(--text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                <option value="paragraph">Paragraph</option>
                <option value="heading1">Heading 1</option>
                <option value="heading2">Heading 2</option>
                <option value="heading3">Heading 3</option>
                <option value="bulleted_list">Bulleted list</option>
                <option value="numbered_list">Numbered list</option>
                <option value="todo">To-do</option>
                <option value="quote">Quote</option>
                <option value="callout">Callout</option>
                <option value="code">Code block</option>
                <option value="divider">Divider</option>
              </select>
              <span className="mx-0.5 h-5 w-px bg-[var(--border)]" aria-hidden="true" />
              {([
                ['Bold', '**', '**', 'font-bold'],
                ['Italic', '*', '*', 'italic'],
                ['Underline', '<u>', '</u>', 'underline'],
                ['Strikethrough', '~~', '~~', 'line-through'],
                ['Inline code', '`', '`', 'font-mono'],
              ] as const).map(([label, before, after, style]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => applyInlineFormat(before, after)}
                  disabled={isReadOnly}
                  title={`${label} (${label === 'Bold' ? 'Ctrl/⌘ + B' : label === 'Italic' ? 'Ctrl/⌘ + I' : 'select text first'})`}
                  className={`h-8 min-w-8 rounded-lg px-2 text-sm text-[var(--text)] hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-40 ${style}`}
                >
                  {label === 'Inline code' ? '<>' : label === 'Strikethrough' ? 'S' : label[0]}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  const url = window.prompt('Paste a link URL');
                  if (url) applyInlineFormat('[', `](${url})`);
                }}
                disabled={isReadOnly}
                className="h-8 rounded-lg px-2 text-xs text-[var(--text-muted)] hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-40"
                title="Add link to selected text"
              >Link
              </button>
              <span className="ml-auto hidden text-[11px] text-[var(--text-subtle)] md:inline">Select text to format · Ctrl/⌘ B or I</span>
              </>}
            </div>
          )}

          {mode === 'code' && (
            <div className="sticky top-12 z-10 -mx-1 sm:mx-0 flex items-center justify-between border-y border-[var(--line)] bg-[var(--paper)] p-2" aria-label="Code controls">
              <span className="font-mono text-xs text-[var(--muted)] uppercase tracking-wider">{codeLanguage} mode</span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-2.5 py-1 rounded-lg bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] text-xs font-mono text-[var(--text)] border border-[var(--border)] transition-colors flex items-center gap-1 cursor-pointer active:scale-95"
              >
                <span>{copiedCode ? '✓ Copied' : 'Copy All Code'}</span>
              </button>
            </div>
          )}

          {/* Unified Editor Surface */}
          <div className={`flex-1 flex items-start gap-2 sm:gap-3 w-full min-w-0 border border-[var(--line)] px-3 py-4 sm:px-7 sm:py-6 ${mode === 'code' ? 'bg-[#151515] text-[#eee9dc]' : 'bg-[var(--surface)] text-[var(--ink)]'}`}>
            {mode === 'text' && isPreview ? (
              <DocumentPreview content={text} />
            ) : <>
            {/* Line numbers gutter in Code mode */}
            {mode === 'code' && (
              <div className="flex flex-col text-right font-mono text-[11px] sm:text-xs text-white/40 select-none py-2 pr-1.5 sm:pr-2 border-r border-white/15 min-w-[1.75rem] sm:min-w-[2.5rem]">
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
              onSelect={(e) => {
                const input = e.currentTarget;
                const lineStart = text.lastIndexOf('\n', Math.max(0, input.selectionStart - 1)) + 1;
                const lineEndAt = text.indexOf('\n', input.selectionStart);
                const line = text.slice(lineStart, lineEndAt < 0 ? text.length : lineEndAt);
                setSelectedBlockType(parseDocument(line).blocks[0]?.type ?? 'paragraph');
              }}
              onChange={(e) => applyTextChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                mode === 'code'
                  ? `// Write ${codeLanguage.toUpperCase()} code here...\n// Real-time synchronization active.`
                  : 'Write your document text here...\nEverything is synchronized in real time without conflicts.'
              }
              className={`flex-1 min-w-0 w-full bg-transparent outline-none resize-none leading-7 focus-visible:ring-0 ${
                mode === 'code'
                  ? 'font-mono text-xs sm:text-sm text-[#eee9dc] placeholder:text-white/35 font-normal'
                  : 'font-sans text-[15px] sm:text-base text-[var(--text)] placeholder-[var(--text-subtle)] font-normal'
              }`}
              spellCheck={mode === 'text'}
              autoFocus
            />
            </>}
          </div>
          <div className="mt-auto flex items-center justify-between border-t border-[var(--line)] pt-3 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--muted)] xl:hidden">
            <span>{wordCount} words <span className="mx-1">·</span> {lineCount} lines</span>
            <button type="button" onClick={() => setIsMobileMenuOpen(true)} className="flex items-center gap-1.5"><Icons.Info size={12} /> Info &amp; collaborators</button>
          </div>
        </main>

        <aside className="hidden border-l border-[var(--line)] px-4 py-7 xl:block">
          <div className="sticky top-20 space-y-8">
            <section>
              <div className="mb-3 font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--muted)]">06 / Collaborators</div>
              <div className="border-y border-[var(--line)] py-3">
                <div className="flex items-center gap-2"><span className="h-2 w-2 bg-[var(--accent)]" /><span className="text-xs font-medium">{activeUserName} <span className="text-[var(--muted)]">(you)</span></span></div>
                <div className="mt-1 pl-4 font-mono text-[9px] text-[var(--muted)]">Editing now / {siteId || 'local'}</div>
              </div>
              {peers.map((peer) => <div key={peer.siteId} className="border-b border-[var(--line)] py-3"><div className="flex items-center gap-2"><span className="h-2 w-2" style={{ backgroundColor: peer.color || 'var(--accent)' }} /><span className="truncate text-xs">{peer.name || peer.siteId}</span></div><div className="mt-1 pl-4 font-mono text-[9px] text-[var(--muted)]">Connected / {peer.siteId}</div></div>)}
              <button type="button" onClick={handleOpenEditName} className="mt-3 font-mono text-[9px] uppercase tracking-wider text-[var(--muted)] hover:text-[var(--accent)]">Edit display name →</button>
            </section>
            <section>
              <div className="mb-3 font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--muted)]">07 / Document info</div>
              <div className="grid grid-cols-2 border-l border-t border-[var(--line)]">
                {[[wordCount, 'WORDS'], [text.length, 'CHARACTERS'], [lineCount, 'LINES'], [`~${readingTimeMins}m`, 'READING'], [rga.getNodes().length, 'CRDT NODES'], [tombstoneCount, 'TOMBSTONES']].map(([value, label]) => <div key={String(label)} className="border-b border-r border-[var(--line)] p-2.5"><div className="font-mono text-sm">{value}</div><TechnicalLabel className="mt-1 block text-[8px]">{label}</TechnicalLabel></div>)}
              </div>
              <div className="mt-3 font-mono text-[9px] text-[var(--muted)]">SITE / {siteId || 'local'}</div>
            </section>
            <section>
              <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--muted)]">08 / Actions</div>
              <button type="button" onClick={() => setIsShareModalOpen(true)} className="flex w-full items-center gap-2 border-b border-[var(--line)] py-2.5 text-left text-xs hover:text-[var(--accent)]"><Icons.Share size={12} /> Share / QR</button>
              <button type="button" onClick={handleCopyLink} className="flex w-full items-center gap-2 border-b border-[var(--line)] py-2.5 text-left text-xs hover:text-[var(--accent)]"><Icons.Copy size={12} /> Copy document link</button>
              <ExportDropdown projectId={documentId} documentTitle={roomName} getContent={() => rgaRef.current.getText()} onFlushSave={onFlushSave} size="md" className="mt-3" />
            </section>
          </div>
        </aside>
      </div>

      {/* Floating Minimal Bottom Diagnostics & Reading Stats Pill */}
      <footer className="sticky bottom-0 z-20 px-3 sm:px-6 py-2 border-t border-[var(--line)] bg-[var(--paper)] text-[9px] text-[var(--muted)] font-mono select-none flex items-center justify-between transition-colors gap-2 overflow-x-auto uppercase tracking-wider">
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <span>{wordCount} words</span>
          <span>•</span>
          <span className="hidden xs:inline">{text.length} chars</span>
          <span className="hidden xs:inline">•</span>
          <span>~{readingTimeMins}m read</span>
          <span>•</span>
          <span>{lineCount} lines</span>
        </div>
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <span>{rga.getNodes().length} CRDT nodes</span>
          <span>•</span>
          <span>{tombstoneCount} tombstones</span>
          <span>•</span>
          <span>Site: {siteId || 'init'}</span>
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
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => setIsEditingName(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-subtle)] hover:text-[var(--text)] hover:bg-[var(--surface-muted)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!nameInput.trim()}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Save Name
            </button>
          </div>
        </form>
      </Modal>

      {/* Mobile Header Sidebar / Drawer */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 animate-fade-in transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-over Drawer Panel to the Left */}
          <aside
            className="fixed top-0 left-0 bottom-0 w-[85vw] max-w-xs bg-[var(--surface)] border-r border-[var(--border)] shadow-2xl z-50 flex flex-col animate-slide-in-left select-none text-[var(--text)] transition-colors overflow-hidden"
            role="dialog"
            aria-label="Document Sidebar Menu"
            aria-modal="true"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-muted)]/50">
              <Link
                href="/"
                className="flex items-center gap-2 min-w-0"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <div className="w-5 h-5 rounded-md bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] flex items-center justify-center">
                  <Icons.Logo size={12} />
                </div>
                <span className="font-semibold text-xs tracking-tight text-[var(--text)] truncate">
                  Braid Menu
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-subtle)] hover:text-[var(--text)] transition-colors cursor-pointer"
                aria-label="Close menu"
              >
                <Icons.X size={16} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 divide-y divide-[var(--border)]">
              {/* Section 0: Mode & Language Selection */}
              <div className="flex flex-col gap-2.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-subtle)]">
                  Editor Mode &amp; Syntax
                </div>
                <div className="p-2.5 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] flex flex-col gap-2.5">
                  <div className="grid grid-cols-2 gap-1 bg-[var(--surface)] p-1 rounded-lg border border-[var(--border)] text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => setMode('text')}
                      className={`py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        mode === 'text'
                          ? 'bg-[var(--surface-hover)] text-[var(--text)] font-semibold shadow-2xs'
                          : 'text-[var(--text-subtle)] hover:text-[var(--text)]'
                      }`}
                    >
                      <span className="font-serif font-bold text-xs">T</span>
                      <span>Plain Text</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('code')}
                      className={`py-1.5 rounded-md font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        mode === 'code'
                          ? 'bg-[var(--surface-hover)] text-[var(--text)] font-semibold shadow-2xs'
                          : 'text-[var(--text-subtle)] hover:text-[var(--text)]'
                      }`}
                    >
                      <span className="text-[var(--accent)] font-bold text-xs">&lt;/&gt;</span>
                      <span>Code</span>
                    </button>
                  </div>

                  {mode === 'code' && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-mono text-[var(--text-subtle)]">Code Language</label>
                      <select
                        value={codeLanguage}
                        onChange={(e) => setCodeLanguage(e.target.value)}
                        className="w-full bg-[var(--surface)] text-[var(--text)] text-xs font-mono rounded-lg px-2.5 py-1.5 border border-[var(--border)] outline-none hover:border-[var(--border-strong)] cursor-pointer transition-colors"
                      >
                        {CODE_LANGUAGES.map((lang) => (
                          <option key={lang.value} value={lang.value} className="bg-[var(--surface)] text-[var(--text)]">
                            {lang.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 1: Document Details & Sharing */}
              <div className="flex flex-col gap-2.5 pt-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-subtle)]">
                  Document
                </div>
                <div className="p-3 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-xs text-[var(--text)] font-mono truncate">
                      {roomName}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyId}
                      className="px-2 py-0.5 rounded-md bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--border-strong)] text-[10px] font-mono text-[var(--text-subtle)] hover:text-[var(--text)] transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                      title="Copy Document ID"
                    >
                      <span>{documentId}</span>
                      {copyFeedback === 'id' ? <Icons.Check size={10} className="text-emerald-400" /> : <Icons.Copy size={10} />}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsShareModalOpen(true);
                    }}
                    className="w-full mt-1 py-1.5 px-3 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-medium transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                  >
                    <Icons.QrCode size={13} />
                    <span>Share Room &amp; QR Code</span>
                  </button>
                </div>
              </div>

              {/* Section 2: User Identity & Account */}
              <div className="flex flex-col gap-2.5 pt-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-subtle)]">
                  Your Identity
                </div>
                <div className="p-3 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] flex flex-col gap-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-black shrink-0"
                        style={{ backgroundColor: userColor }}
                      >
                        {activeUserName.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-medium text-[var(--text)] truncate">{activeUserName}</span>
                        <span className="text-[10px] font-mono text-[var(--text-subtle)]">Site: {siteId}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        handleOpenEditName();
                      }}
                      className="px-2 py-1 rounded-lg text-[11px] font-medium text-[var(--text-subtle)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] border border-[var(--border)] transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <Icons.Edit size={11} />
                      <span>Edit</span>
                    </button>
                  </div>

                  {userId && !userId.startsWith('guest-') ? (
                    <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-xs">
                      <Link
                        href="/dashboard"
                        className="text-xs font-medium text-[var(--text-subtle)] hover:text-[var(--text)] transition-colors flex items-center gap-1"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Icons.Folder size={12} />
                        <span>Dashboard</span>
                      </Link>
                      <button
                        type="button"
                        onClick={async () => {
                          await fetch('/api/auth/logout', { method: 'POST' });
                          window.location.reload();
                        }}
                        className="text-xs font-medium text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Icons.LogOut size={12} />
                        <span>Log Out</span>
                      </button>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-[var(--border)]">
                      <Link
                        href={`/login?from=/${encodeURIComponent(documentId)}`}
                        className="w-full py-1.5 px-3 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text)] text-xs font-medium transition-all flex items-center justify-center gap-1.5"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Icons.LogIn size={12} />
                        <span>Log In / Sign Up</span>
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 3: Collaborators & Sync Status */}
              <div className="flex flex-col gap-2.5 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-subtle)]">
                    Collaborators ({totalCollaborators})
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono ${
                      saveStatus === 'saved' || (!saveStatus && connectionStatus === 'connected')
                        ? 'text-emerald-500 bg-emerald-500/10'
                        : saveStatus === 'saving' || connectionStatus === 'connecting' || connectionStatus === 'reconnecting'
                        ? 'text-amber-500 bg-amber-500/10'
                        : 'text-rose-500 bg-rose-500/10'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    <span>
                      {connectionStatus === 'connected' ? 'Synced' : connectionStatus === 'connecting' ? 'Connecting' : connectionStatus === 'reconnecting' ? 'Reconnecting' : 'Offline'}
                    </span>
                  </span>
                </div>

                <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto">
                  {/* Current User */}
                  <div className="flex items-center gap-2 p-1.5 rounded-xl bg-[var(--surface-muted)]">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-black shrink-0"
                      style={{ backgroundColor: userColor }}
                    >
                      {activeUserName.slice(0, 1).toUpperCase()}
                    </div>
                    <span className="text-xs font-medium truncate text-[var(--text)]">{activeUserName} (you)</span>
                  </div>

                  {/* Remote Peers */}
                  {peers.map((peer) => (
                    <div key={peer.siteId} className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-[var(--surface-muted)]">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-black shrink-0"
                        style={{ backgroundColor: peer.color || '#F5C6B0' }}
                      >
                        {(peer.name || peer.siteId).slice(0, 1).toUpperCase()}
                      </div>
                      <span className="text-xs font-medium truncate text-[var(--text)]">{peer.name || peer.siteId}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 4: Export & Actions */}
              <div className="flex flex-col gap-2.5 pt-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-subtle)]">
                  Actions &amp; Export
                </div>

                <div className="flex flex-col gap-2">
                  <div className="w-full">
                    <ExportDropdown
                      projectId={documentId}
                      documentTitle={roomName}
                      getContent={() => rgaRef.current.getText()}
                      onFlushSave={onFlushSave}
                      size="md"
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Section 5: Appearance */}
              <div className="flex flex-col gap-2.5 pt-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-subtle)]">
                  Appearance
                </div>
                <div className="p-2.5 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--text)]">Color Theme</span>
                  <ThemeToggle variant="segmented" />
                </div>
              </div>

              {/* Section 6: Document Stats */}
              <div className="flex flex-col gap-2 pt-3 pb-2 text-[10px] font-mono text-[var(--text-subtle)]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-subtle)]">
                  Statistics
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="p-2 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)]">
                    <div className="text-[9px] uppercase">Words</div>
                    <div className="text-xs font-semibold text-[var(--text)]">{wordCount}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)]">
                    <div className="text-[9px] uppercase">Reading Time</div>
                    <div className="text-xs font-semibold text-[var(--text)]">~{readingTimeMins} min</div>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)]">
                    <div className="text-[9px] uppercase">Lines</div>
                    <div className="text-xs font-semibold text-[var(--text)]">{lineCount}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)]">
                    <div className="text-[9px] uppercase">CRDT Nodes</div>
                    <div className="text-xs font-semibold text-[var(--text)]">{rga.getNodes().length}</div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* Floating Previous Documents Sidebar in Bottom-Right Corner */}
      <PreviousDocumentsSidebar />

      {/* Share Room QR Code & Link Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        documentId={documentId}
        documentTitle={roomName}
      />
    </div>
  );
};
