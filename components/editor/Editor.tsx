'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { RGA } from '../../crdt-engine/src/index';
import type { Op, OpId } from '../../crdt-engine/src/index';
import { SyncClient, ConnectionStatus } from '../../lib/sync-client';
import { getWebSocketUrl } from '../../lib/ws-config';
import type { PeerInfo } from '../../sync-server/server';
import { getStoredUserName, setStoredUserName, getStoredRoomName, setStoredRoomName } from '../../lib/room-storage';
import {
  parseDocument,
  serializeDocument,
  type Block,
  type BlockType,
} from '../../lib/document-model';
import { BlockItem } from './BlockItem';
import { SlashMenu, type SlashMenuItem } from './SlashMenu';
import { FormatToolbar } from './FormatToolbar';
import { DocumentOutline } from './DocumentOutline';
import { Icons } from '../ui/icons';

interface EditorProps {
  documentId: string;
  initialRoomName?: string;
  initialUserName?: string;
  siteId?: string;
  serverUrl?: string;
  userName?: string;
  userId?: string;
  sessionId?: string;
  userColor?: string;
  initialContent?: string;
  isReadOnly?: boolean;
  onOperation?: (op: Op) => void;
  onContentChange?: (content: string) => void;
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
  userColor: initialUserColor,
  initialContent = '',
  isReadOnly = false,
  onOperation,
  onContentChange,
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
  const [showOutline, setShowOutline] = useState(false);

  // Focus & UI States
  const [focusedBlockIndex, setFocusedBlockIndex] = useState<number>(0);
  const [slashMenuState, setSlashMenuState] = useState<{
    isOpen: boolean;
    query: string;
    blockIndex: number;
    position?: { top: number; left: number };
  }>({ isOpen: false, query: '', blockIndex: 0 });

  const [formatToolbarState, setFormatToolbarState] = useState<{
    isOpen: boolean;
    blockIndex: number;
    selection: { start: number; end: number };
    position: { top: number; left: number };
  }>({
    isOpen: false,
    blockIndex: 0,
    selection: { start: 0, end: 0 },
    position: { top: 0, left: 0 },
  });

  const draggedBlockIndexRef = useRef<number | null>(null);
  const syncClientRef = useRef<SyncClient | null>(null);

  // Parse structured blocks from current RGA text
  const docState = useMemo(() => parseDocument(text), [text]);

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
      autoConnect: true,
      onRemoteOp: (op: Op) => {
        client.applyRemoteOp(rga, op);
        updateMetrics();
        onContentChange?.(rga.getText());
      },
      onSyncComplete: (history: readonly Op[]) => {
        client.applyHistory(rga, history);
        updateMetrics();
        onContentChange?.(rga.getText());
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
  }, [documentId, siteId, isJoined, activeUserName, userColor, propServerUrl, rga, userId, sessionId, updateMetrics, onContentChange]);

  /**
   * Applies changes from a new serialized document string to the underlying RGA CRDT.
   * Calculates character deltas and broadcasts ops through SyncClient.
   */
  const applyDocumentTextDiff = useCallback(
    (newText: string) => {
      if (!siteId || !isJoined || isReadOnly) return;
      const oldText = rga.getText();
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
        const targetId = rga.idAtVisibleOffset(prefix + 1);
        if (targetId) {
          const op = rga.localDelete(targetId);
          syncClientRef.current?.sendOperation(op);
          onOperation?.(op);
        }
      }

      // Apply inserts
      for (let i = 0; i < insertText.length; i++) {
        const char = insertText[i];
        const afterId = prefix + i === 0 ? null : rga.idAtVisibleOffset(prefix + i);
        const op = rga.localInsert(afterId, char);
        syncClientRef.current?.sendOperation(op);
        onOperation?.(op);
      }

      updateMetrics();
      onContentChange?.(newText);
    },
    [siteId, isJoined, isReadOnly, rga, onOperation, onContentChange, updateMetrics]
  );

  // Handle block content change
  const handleBlockContentChange = (blockIndex: number, newContent: string) => {
    // Markdown shortcut conversions (e.g. typing '# ' or '- ' at start of block)
    if (newContent === '# ') {
      handleConvertBlockType(blockIndex, 'heading1');
      return;
    }
    if (newContent === '## ') {
      handleConvertBlockType(blockIndex, 'heading2');
      return;
    }
    if (newContent === '### ') {
      handleConvertBlockType(blockIndex, 'heading3');
      return;
    }
    if (newContent === '- ' || newContent === '* ') {
      handleConvertBlockType(blockIndex, 'bulleted_list');
      return;
    }
    if (newContent === '1. ') {
      handleConvertBlockType(blockIndex, 'numbered_list');
      return;
    }
    if (newContent === '[] ' || newContent === '[ ] ') {
      handleConvertBlockType(blockIndex, 'todo');
      return;
    }
    if (newContent === '> ') {
      handleConvertBlockType(blockIndex, 'quote');
      return;
    }
    if (newContent === '> 💡 ') {
      handleConvertBlockType(blockIndex, 'callout');
      return;
    }
    if (newContent === '```') {
      handleConvertBlockType(blockIndex, 'code');
      return;
    }
    if (newContent === '---') {
      handleConvertBlockType(blockIndex, 'divider');
      return;
    }

    // Check for slash menu trigger
    if (newContent.startsWith('/')) {
      const rect = document.getElementById(docState.blocks[blockIndex]?.id)?.getBoundingClientRect();
      setSlashMenuState({
        isOpen: true,
        query: newContent,
        blockIndex,
        position: rect ? { top: rect.bottom + window.scrollY, left: rect.left + window.scrollX } : undefined,
      });
    } else if (slashMenuState.isOpen) {
      setSlashMenuState((prev) => ({ ...prev, isOpen: false }));
    }

    const updatedBlocks = [...docState.blocks];
    if (updatedBlocks[blockIndex]) {
      updatedBlocks[blockIndex] = { ...updatedBlocks[blockIndex], content: newContent };
      applyDocumentTextDiff(serializeDocument(updatedBlocks));
    }
  };

  // Convert block type
  const handleConvertBlockType = (blockIndex: number, newType: BlockType) => {
    const updatedBlocks = [...docState.blocks];
    if (updatedBlocks[blockIndex]) {
      const current = updatedBlocks[blockIndex];
      updatedBlocks[blockIndex] = {
        ...current,
        type: newType,
        content: current.content.replace(/^\/[a-z0-9]*\s*/i, '').trim(),
      };
      applyDocumentTextDiff(serializeDocument(updatedBlocks));
      setSlashMenuState((prev) => ({ ...prev, isOpen: false }));
    }
  };

  // Toggle todo checkbox
  const handleToggleTodo = (blockIndex: number) => {
    const updatedBlocks = [...docState.blocks];
    if (updatedBlocks[blockIndex]) {
      const current = updatedBlocks[blockIndex];
      updatedBlocks[blockIndex] = {
        ...current,
        checked: !current.checked,
      };
      applyDocumentTextDiff(serializeDocument(updatedBlocks));
    }
  };

  // Insert block below
  const handleInsertBelow = (blockIndex: number, type: BlockType = 'paragraph') => {
    const updatedBlocks = [...docState.blocks];
    const newBlock: Block = {
      id: `block-insert-${blockIndex + 1}`,
      type,
      content: '',
      rawLine: '',
      lineIndex: blockIndex + 1,
    };
    updatedBlocks.splice(blockIndex + 1, 0, newBlock);
    applyDocumentTextDiff(serializeDocument(updatedBlocks));
    setFocusedBlockIndex(blockIndex + 1);
  };

  // Delete block
  const handleDeleteBlock = (blockIndex: number) => {
    if (docState.blocks.length <= 1) {
      // Keep at least one empty paragraph block
      const updatedBlocks: Block[] = [
        {
          id: 'block-0',
          type: 'paragraph',
          content: '',
          rawLine: '',
          lineIndex: 0,
        },
      ];
      applyDocumentTextDiff(serializeDocument(updatedBlocks));
      setFocusedBlockIndex(0);
      return;
    }

    const updatedBlocks = [...docState.blocks];
    updatedBlocks.splice(blockIndex, 1);
    applyDocumentTextDiff(serializeDocument(updatedBlocks));
    setFocusedBlockIndex(Math.max(0, blockIndex - 1));
  };

  // Duplicate block
  const handleDuplicateBlock = (blockIndex: number) => {
    const current = docState.blocks[blockIndex];
    if (!current) return;
    const updatedBlocks = [...docState.blocks];
    const duplicated: Block = {
      ...current,
      id: `block-dup-${blockIndex + 1}`,
    };
    updatedBlocks.splice(blockIndex + 1, 0, duplicated);
    applyDocumentTextDiff(serializeDocument(updatedBlocks));
    setFocusedBlockIndex(blockIndex + 1);
  };

  // Move block up / down
  const handleMoveBlock = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= docState.blocks.length || fromIndex === toIndex) return;
    const updatedBlocks = [...docState.blocks];
    const [moved] = updatedBlocks.splice(fromIndex, 1);
    updatedBlocks.splice(toIndex, 0, moved);
    applyDocumentTextDiff(serializeDocument(updatedBlocks));
    setFocusedBlockIndex(toIndex);
  };

  // Drag and drop reordering
  const handleDragStart = (index: number) => {
    draggedBlockIndexRef.current = index;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetIndex: number) => {
    const fromIndex = draggedBlockIndexRef.current;
    if (fromIndex !== null && fromIndex !== targetIndex) {
      handleMoveBlock(fromIndex, targetIndex);
    }
    draggedBlockIndexRef.current = null;
  };

  // Block Keyboard Navigation
  const handleBlockKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>,
    blockIndex: number
  ) => {
    const block = docState.blocks[blockIndex];
    const target = e.currentTarget;

    // Enter key: create next block or list item
    if (e.key === 'Enter' && !e.shiftKey) {
      if (slashMenuState.isOpen) return; // Allow slash menu to handle Enter

      e.preventDefault();
      // If inside a list/todo and content is empty, convert back to paragraph
      if (
        (block.type === 'bulleted_list' || block.type === 'numbered_list' || block.type === 'todo') &&
        !block.content.trim()
      ) {
        handleConvertBlockType(blockIndex, 'paragraph');
        return;
      }

      // Preserve list type for next item
      const nextType =
        block.type === 'bulleted_list' || block.type === 'numbered_list' || block.type === 'todo'
          ? block.type
          : 'paragraph';
      handleInsertBelow(blockIndex, nextType);
      return;
    }

    // Backspace on empty block: convert to paragraph or delete
    if (e.key === 'Backspace' && target.selectionStart === 0 && target.selectionEnd === 0) {
      if (block.type !== 'paragraph') {
        e.preventDefault();
        handleConvertBlockType(blockIndex, 'paragraph');
        return;
      }
      if (!block.content && docState.blocks.length > 1) {
        e.preventDefault();
        handleDeleteBlock(blockIndex);
        return;
      }
    }

    // Arrow Navigation between blocks
    if (e.key === 'ArrowUp' && target.selectionStart === 0 && blockIndex > 0) {
      e.preventDefault();
      setFocusedBlockIndex(blockIndex - 1);
      return;
    }
    if (
      e.key === 'ArrowDown' &&
      target.selectionStart === target.value.length &&
      blockIndex < docState.blocks.length - 1
    ) {
      e.preventDefault();
      setFocusedBlockIndex(blockIndex + 1);
      return;
    }

    // Formatting Keyboard Shortcuts (Cmd+B, Cmd+I, Cmd+U, Cmd+K)
    if (e.metaKey || e.ctrlKey) {
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        handleApplyInlineFormat(blockIndex, 'bold');
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        handleApplyInlineFormat(blockIndex, 'italic');
      } else if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        handleApplyInlineFormat(blockIndex, 'underline');
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        handleApplyInlineFormat(blockIndex, 'link');
      }
    }
  };

  // Text selection detection for Floating FormatToolbar
  const handleSelectText = (
    e: React.SyntheticEvent<HTMLTextAreaElement | HTMLInputElement>,
    blockIndex: number
  ) => {
    const target = e.currentTarget;
    const start = target.selectionStart ?? 0;
    const end = target.selectionEnd ?? 0;

    if (start !== end) {
      const rect = target.getBoundingClientRect();
      setFormatToolbarState({
        isOpen: true,
        blockIndex,
        selection: { start, end },
        position: { top: rect.top + window.scrollY, left: rect.left + (start * 8) },
      });
    } else if (formatToolbarState.isOpen) {
      setFormatToolbarState((prev) => ({ ...prev, isOpen: false }));
    }
  };

  // Apply Inline Formatting (Wrap selected text with markdown formatting tags)
  const handleApplyInlineFormat = (
    blockIndex: number,
    formatType: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code' | 'link'
  ) => {
    const block = docState.blocks[blockIndex];
    if (!block) return;

    const start = formatToolbarState.selection.start;
    const end = formatToolbarState.selection.end;
    const selected = block.content.slice(start, end) || 'text';

    let formatted = selected;
    switch (formatType) {
      case 'bold':
        formatted = `**${selected}**`;
        break;
      case 'italic':
        formatted = `*${selected}*`;
        break;
      case 'underline':
        formatted = `<u>${selected}</u>`;
        break;
      case 'strikethrough':
        formatted = `~~${selected}~~`;
        break;
      case 'code':
        formatted = `\`${selected}\``;
        break;
      case 'link':
        formatted = `[${selected}](https://)`;
        break;
    }

    const newContent = block.content.slice(0, start) + formatted + block.content.slice(end);
    handleBlockContentChange(blockIndex, newContent);
    setFormatToolbarState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleSlashMenuSelect = (item: SlashMenuItem) => {
    handleConvertBlockType(slashMenuState.blockIndex, item.type);
    setSlashMenuState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleScrollToBlock = (blockId: string) => {
    const el = document.getElementById(blockId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const index = docState.blocks.findIndex((b) => b.id === blockId);
      if (index !== -1) setFocusedBlockIndex(index);
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
        <div className="w-full max-w-md rounded-3xl bg-[#ffffff] border border-[#e8e6e1] p-8 sm:p-10 shadow-card flex flex-col gap-6 animate-fade-in">
          <div className="flex flex-col items-center text-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#191919] text-[#ffffff] flex items-center justify-center shadow-xs mb-1">
              <Icons.Logo size={18} />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f4f3ef] border border-[#e8e6e1] text-xs font-medium text-[#64635e]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-glow" />
              <span>Live Collaborative Session</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-[#191919] mt-1">Join Room</h2>
            <div className="flex items-center justify-center gap-1.5 text-xs text-[#64635e]">
              <span className="font-semibold text-[#191919]">{roomName}</span>
              <span>•</span>
              <span className="font-mono bg-[#f4f3ef] px-2 py-0.5 rounded-full">{documentId}</span>
            </div>
          </div>

          <form onSubmit={handleJoinGateSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="join-gate-name" className="text-xs font-semibold text-[#191919]">
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
                className={`w-full px-3.5 py-2.5 rounded-xl bg-[#faf9f6] border text-sm text-[#191919] placeholder-[#9a9994] outline-none transition-all ${
                  gateError
                    ? 'border-red-500 focus:ring-2 focus:ring-red-400/20'
                    : 'border-[#e8e6e1] focus:border-[#191919]'
                }`}
              />
              {gateError && (
                <p className="text-xs text-red-600 font-medium">{gateError}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#191919] text-[#ffffff] text-xs font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-xs flex items-center justify-center gap-1.5 mt-1"
            >
              <span>Join Document</span>
              <Icons.ArrowRight size={13} />
            </button>
          </form>

          <div className="text-center pt-2 border-t border-[#e8e6e1]">
            <Link href="/" className="text-xs text-[#64635e] hover:text-[#191919] transition-colors inline-flex items-center gap-1">
              <Icons.ArrowLeft size={12} />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const totalCollaborators = peers.length + 1;

  return (
    <div className="flex flex-col h-full w-full rounded-2xl bg-[#ffffff] text-[#191919] border border-[#e8e6e1] overflow-hidden shadow-card">
      {/* Top Workspace Navigation Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-3.5 bg-[#faf9f6] border-b border-[#e8e6e1] gap-3">
        {/* Left: Branding, Room Name & Room ID */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm font-bold tracking-tight text-[#191919] hover:opacity-80 transition-opacity"
            title="Back to Home"
          >
            <div className="w-5 h-5 rounded-md bg-[#191919] text-[#ffffff] flex items-center justify-center">
              <Icons.Logo size={11} />
            </div>
            <span>Braid</span>
          </Link>

          <span className="text-xs text-[#9a9994]">/</span>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs text-[#191919] tracking-tight">{roomName}</span>
            <div className="flex items-center gap-1 bg-[#f4f3ef] border border-[#e8e6e1] pl-2 pr-1 py-0.5 rounded-full text-[11px] font-mono text-[#64635e]">
              <span>{documentId}</span>
              <button
                type="button"
                onClick={handleCopyId}
                className="p-0.5 hover:bg-[#e8e6e1] rounded-full transition-colors"
                title="Copy Room ID"
              >
                {copyFeedback === 'id' ? <Icons.Check size={10} className="text-emerald-600" /> : <Icons.Copy size={10} />}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Autosave Status, Collaborators & User Identity */}
        <div className="flex items-center gap-3">
          {/* Connection Status Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f4f3ef] border border-[#e8e6e1] text-[11px] font-medium">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-500'
                  : connectionStatus === 'connecting' || connectionStatus === 'reconnecting'
                  ? 'bg-amber-500 animate-pulse'
                  : connectionStatus === 'error'
                  ? 'bg-rose-500'
                  : 'bg-neutral-400'
              }`}
            />
            <span className="text-[#64635e]">
              {connectionStatus === 'connected'
                ? '✓ Synced'
                : connectionStatus === 'connecting'
                ? 'Connecting...'
                : connectionStatus === 'reconnecting'
                ? 'Reconnecting...'
                : connectionStatus === 'error'
                ? 'Sync Error'
                : 'Offline'}
            </span>
          </div>

          {/* Collaborator Count & Avatar Stack */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPeersDropdown((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f4f3ef] border border-[#e8e6e1] hover:border-[#191919] text-[11px] font-semibold text-[#191919] transition-all"
              title="View Active Collaborators"
            >
              <Icons.Users size={12} className="text-[#64635e]" />
              <span>{totalCollaborators}</span>
            </button>

            {/* Collaborators Dropdown Menu */}
            {showPeersDropdown && (
              <div className="absolute right-0 top-full mt-2 w-56 p-3 rounded-2xl bg-[#ffffff] border border-[#e8e6e1] shadow-modal z-30 flex flex-col gap-2 animate-slide-down">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#9a9994] px-1">
                  Active in Room ({totalCollaborators})
                </div>
                <div className="flex flex-col gap-1.5">
                  {/* Current User */}
                  <div className="flex items-center gap-2 p-1.5 rounded-xl bg-[#faf9f6]">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-black border border-[#e8e6e1]"
                      style={{ backgroundColor: userColor }}
                    >
                      {activeUserName.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold truncate">{activeUserName} (you)</span>
                      <span className="text-[10px] font-mono text-[#9a9994]">{siteId}</span>
                    </div>
                  </div>

                  {/* Remote Peers */}
                  {peers.map((peer) => (
                    <div key={peer.siteId} className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-[#faf9f6]">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-black border border-[#e8e6e1]"
                        style={{ backgroundColor: peer.color || '#F5C6B0' }}
                      >
                        {(peer.name || peer.siteId).slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold truncate">{peer.name || peer.siteId}</span>
                        <span className="text-[10px] font-mono text-[#9a9994]">{peer.siteId}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Current User Pill */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-black border border-[#e8e6e1] shadow-xs"
            style={{ backgroundColor: userColor }}
            title={siteId ? `You (${siteId})` : 'You'}
          >
            <span className="font-semibold">{activeUserName}</span>
            <span className="text-[10px] opacity-60 font-mono">(you)</span>
          </div>

          {/* Share / Copy Link Button */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="text-xs font-medium px-3 py-1 rounded-full bg-[#191919] text-[#ffffff] hover:opacity-90 transition-opacity shadow-xs flex items-center gap-1"
            title="Copy Invite Link"
          >
            <span>{copyFeedback === 'link' ? 'Copied!' : 'Share'}</span>
            <Icons.Share size={10} />
          </button>
        </div>
      </div>

      {/* Offline Warning Banner */}
      {connectionStatus === 'offline' && (
        <div className="px-6 py-2 bg-[#fef3c7] border-b border-[#fde68a] text-xs font-medium text-[#92400e] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>You are offline. Edits are saved locally and will synchronize when your network returns.</span>
          </div>
          {pendingOpsCount > 0 && (
            <span className="font-semibold bg-[#fde68a] px-2 py-0.5 rounded-full text-[11px]">
              {pendingOpsCount} queued
            </span>
          )}
        </div>
      )}

      {/* Reconnecting Banner */}
      {connectionStatus === 'reconnecting' && (
        <div className="px-6 py-2 bg-[#eff6ff] border-b border-[#dbeafe] text-xs font-medium text-[#1e40af] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icons.Spinner size={12} className="animate-spin text-[#3b82f6]" />
            <span>Reconnecting to Braid sync server...</span>
          </div>
          {pendingOpsCount > 0 && (
            <span className="font-semibold bg-[#dbeafe] px-2 py-0.5 rounded-full text-[11px]">
              {pendingOpsCount} queued
            </span>
          )}
        </div>
      )}

      {/* Error Banner */}
      {connectionStatus === 'error' && (
        <div className="px-6 py-2 bg-[#fef2f2] border-b border-[#fecaca] text-xs font-medium text-[#991b1b] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icons.AlertCircle size={14} className="text-[#dc2626]" />
            <span>Sync server error: your session may have expired or project access was rejected.</span>
          </div>
        </div>
      )}

      {/* Main Workspace Layout (Sidebar Outline + Notion Document Canvas) */}
      <div className="flex-1 flex flex-col md:flex-row min-h-[520px] relative">
        {/* Left Table of Contents Sidebar */}
        <aside className="p-4 border-r border-[#e8e6e1]/80 bg-[#faf9f6]/50 md:w-fit">
          <DocumentOutline
            blocks={docState.blocks}
            onScrollToBlock={handleScrollToBlock}
            isOpen={showOutline}
            onToggle={() => setShowOutline((prev) => !prev)}
          />
        </aside>

        {/* Center Document Writing Canvas */}
        <main className="flex-1 max-w-3xl mx-auto w-full p-6 sm:p-12 flex flex-col gap-1.5">
          {/* Blocks List */}
          {docState.blocks.map((block, index) => (
            <BlockItem
              key={block.id}
              block={block}
              index={index}
              totalBlocks={docState.blocks.length}
              isFocused={focusedBlockIndex === index}
              onFocus={() => setFocusedBlockIndex(index)}
              onChangeContent={(content) => handleBlockContentChange(index, content)}
              onKeyDown={(e) => handleBlockKeyDown(e, index)}
              onSelectText={(e) => handleSelectText(e, index)}
              onToggleTodo={() => handleToggleTodo(index)}
              onInsertBelow={(type) => handleInsertBelow(index, type)}
              onDeleteBlock={() => handleDeleteBlock(index)}
              onDuplicateBlock={() => handleDuplicateBlock(index)}
              onMoveUp={() => handleMoveBlock(index, index - 1)}
              onMoveDown={() => handleMoveBlock(index, index + 1)}
              onConvertType={(type) => handleConvertBlockType(index, type)}
              onOpenSlashMenu={(rect) => {
                setSlashMenuState({
                  isOpen: true,
                  query: '',
                  blockIndex: index,
                  position: { top: rect.bottom + window.scrollY, left: rect.left + window.scrollX },
                });
              }}
              dragHandleProps={{
                draggable: true,
                onDragStart: () => handleDragStart(index),
                onDragOver: handleDragOver,
                onDrop: () => handleDrop(index),
              }}
            />
          ))}

          {/* Empty bottom area click to add block */}
          <div
            className="flex-1 min-h-[120px] cursor-text py-6"
            onClick={() => handleInsertBelow(docState.blocks.length - 1, 'paragraph')}
          />
        </main>
      </div>

      {/* Floating Slash Command Menu */}
      {slashMenuState.isOpen && (
        <SlashMenu
          query={slashMenuState.query}
          onSelect={handleSlashMenuSelect}
          onClose={() => setSlashMenuState((prev) => ({ ...prev, isOpen: false }))}
          position={slashMenuState.position}
        />
      )}

      {/* Floating Formatting Toolbar */}
      {formatToolbarState.isOpen && (
        <FormatToolbar
          position={formatToolbarState.position}
          currentBlockType={docState.blocks[formatToolbarState.blockIndex]?.type || 'paragraph'}
          onFormat={(formatType) => handleApplyInlineFormat(formatToolbarState.blockIndex, formatType)}
          onConvertBlockType={(newType) => handleConvertBlockType(formatToolbarState.blockIndex, newType)}
        />
      )}

      {/* Editor Footer / Diagnostics Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-2.5 bg-[#faf8f5] border-t border-[#e8e6e1] text-[11px] text-[#9a9994] gap-2 select-none font-mono">
        <div className="flex items-center gap-2.5">
          <span>{docState.blocks.length} blocks</span>
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
      </div>
    </div>
  );
};


