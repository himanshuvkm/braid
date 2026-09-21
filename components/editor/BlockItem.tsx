'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { Block, BlockType } from '../../lib/document-model';
import { Icons } from '../ui/icons';
import { Dropdown } from '../ui/dropdown';

export const CODE_LANGUAGES = [
  { value: 'javascript', label: 'JavaScript (JS)', short: 'js' },
  { value: 'typescript', label: 'TypeScript (TS)', short: 'ts' },
  { value: 'cpp', label: 'C++', short: 'cpp' },
  { value: 'c', label: 'C', short: 'c' },
  { value: 'java', label: 'Java', short: 'java' },
  { value: 'python', label: 'Python (PY)', short: 'py' },
  { value: 'rust', label: 'Rust', short: 'rs' },
  { value: 'go', label: 'Go', short: 'go' },
  { value: 'html', label: 'HTML', short: 'html' },
  { value: 'css', label: 'CSS', short: 'css' },
  { value: 'json', label: 'JSON', short: 'json' },
  { value: 'sql', label: 'SQL', short: 'sql' },
];

interface BlockItemProps {
  block: Block;
  index: number;
  totalBlocks: number;
  isFocused: boolean;
  onFocus: () => void;
  onChangeContent: (content: string) => void;
  onChangeLanguage?: (language: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
  onSelectText?: (e: React.SyntheticEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
  onInsertBelow?: (type?: BlockType) => void;
  onDeleteBlock: () => void;
  onDuplicateBlock?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onConvertType: (type: BlockType, language?: string) => void;
  onOpenSlashMenu?: (anchorRect: DOMRect) => void;
  dragHandleProps?: {
    draggable: boolean;
    onDragStart: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };
}

export const BlockItem: React.FC<BlockItemProps> = ({
  block,
  index,
  totalBlocks,
  isFocused,
  onFocus,
  onChangeContent,
  onChangeLanguage,
  onKeyDown,
  onSelectText,
  onInsertBelow,
  onDeleteBlock,
  onDuplicateBlock,
  onMoveUp,
  onMoveDown,
  onConvertType,
  dragHandleProps,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height to fit content
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.max(28, inputRef.current.scrollHeight)}px`;
    }
  }, [block.content, block.type]);

  // Focus effect when selected
  useEffect(() => {
    if (isFocused && inputRef.current && document.activeElement !== inputRef.current) {
      inputRef.current.focus();
    }
  }, [isFocused]);

  const handleCopyCode = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(block.content);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Handle Tab key inside Code textarea for clean 2-space indentation
  const handleCodeKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const val = target.value;
      const newVal = val.substring(0, start) + '  ' + val.substring(end);
      onChangeContent(newVal);
      // restore cursor
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.selectionStart = inputRef.current.selectionEnd = start + 2;
        }
      }, 0);
      return;
    }
    onKeyDown(e);
  };

  const isCode = block.type === 'code';
  const currentLang = block.codeLanguage || 'typescript';

  // Specific font/style sizing per block type
  const getBlockStyles = () => {
    switch (block.type) {
      case 'heading1':
        return 'text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text)] leading-tight';
      case 'heading2':
        return 'text-xl sm:text-2xl font-semibold tracking-tight text-[var(--text)] leading-snug mt-2';
      case 'heading3':
        return 'text-lg sm:text-xl font-semibold text-[var(--text)] leading-snug mt-1';
      case 'quote':
        return 'italic text-sm text-[var(--text-muted)] border-l-2 border-[var(--accent)] pl-3 my-0.5';
      case 'callout':
        return 'text-xs sm:text-sm text-[var(--text)] leading-relaxed';
      case 'code':
        return 'font-mono text-xs text-[var(--text)] leading-relaxed';
      default:
        return 'text-sm text-[var(--text)] leading-relaxed';
    }
  };

  return (
    <div
      id={block.id}
      data-block-id={block.id}
      className={`group relative flex items-start gap-1.5 py-1 px-1.5 -mx-1.5 rounded-xl transition-colors ${
        isFocused ? 'bg-[var(--surface-hover)]/40 ring-1 ring-[var(--border)]' : 'hover:bg-[var(--surface-muted)]/50'
      }`}
      onDragOver={dragHandleProps?.onDragOver}
      onDrop={dragHandleProps?.onDrop}
    >
      {/* Left Block Controls: 6-dot Drag handle & Quick Action Menu */}
      <div className="flex items-center gap-0.5 pt-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity select-none shrink-0 w-12 justify-end">
        {onInsertBelow && (
          <button
            type="button"
            onClick={() => onInsertBelow()}
            className="w-5 h-5 flex items-center justify-center rounded-md text-[var(--text-subtle)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
            title="Insert block below"
          >
            <Icons.Plus size={12} />
          </button>
        )}

        {/* 6-dot grip with dropdown actions */}
        <Dropdown
          align="left"
          trigger={
            <button
              type="button"
              className="w-5 h-5 flex items-center justify-center rounded-md text-[var(--text-subtle)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors cursor-grab active:cursor-grabbing"
              title="Drag or click for block options"
              {...dragHandleProps}
            >
              <Icons.GripVertical size={13} />
            </button>
          }
          items={[
            {
              id: 'convert-text',
              label: 'Turn into Text',
              onClick: () => onConvertType('paragraph'),
            },
            {
              id: 'convert-h1',
              label: 'Turn into Heading 1',
              onClick: () => onConvertType('heading1'),
            },
            {
              id: 'convert-h2',
              label: 'Turn into Heading 2',
              onClick: () => onConvertType('heading2'),
            },
            {
              id: 'convert-code',
              label: 'Turn into Code Block',
              onClick: () => onConvertType('code', 'typescript'),
            },
            {
              id: 'convert-quote',
              label: 'Turn into Quote',
              onClick: () => onConvertType('quote'),
            },
            {
              id: 'convert-callout',
              label: 'Turn into Callout',
              onClick: () => onConvertType('callout'),
            },
            'divider',
            ...(onDuplicateBlock
              ? [
                  {
                    id: 'duplicate-block',
                    label: 'Duplicate Block',
                    icon: <Icons.Copy size={12} />,
                    onClick: onDuplicateBlock,
                  },
                ]
              : []),
            ...(onMoveUp
              ? [
                  {
                    id: 'move-up',
                    label: 'Move Up',
                    icon: <Icons.ChevronUp size={12} />,
                    onClick: onMoveUp,
                  },
                ]
              : []),
            ...(onMoveDown
              ? [
                  {
                    id: 'move-down',
                    label: 'Move Down',
                    icon: <Icons.ChevronDown size={12} />,
                    onClick: onMoveDown,
                  },
                ]
              : []),
            'divider',
            {
              id: 'delete-block',
              label: 'Delete Block',
              icon: <Icons.Trash size={12} />,
              danger: true,
              onClick: onDeleteBlock,
            },
          ]}
        />
      </div>

      {/* Block Content Rendering */}
      <div className="flex-1 min-w-0">
        {isCode ? (
          <div className="rounded-xl bg-[var(--surface-muted)] text-[var(--text)] p-3.5 font-mono text-xs shadow-xs border border-[var(--border)] flex flex-col gap-2 transition-colors">
            {/* Code Block Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)] select-none">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase text-[var(--text-subtle)] font-semibold tracking-wider">
                  Language:
                </span>
                <select
                  value={currentLang}
                  onChange={(e) => {
                    const newLang = e.target.value;
                    if (onChangeLanguage) {
                      onChangeLanguage(newLang);
                    } else {
                      onConvertType('code', newLang);
                    }
                  }}
                  className="bg-[var(--surface)] text-[var(--text)] text-xs font-mono rounded-lg px-2 py-0.5 border border-[var(--border)] outline-none hover:border-[var(--border-strong)] cursor-pointer transition-colors"
                >
                  {CODE_LANGUAGES.map((lang) => (
                    <option key={lang.value} value={lang.value} className="bg-[var(--surface)] text-[var(--text)]">
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onConvertType('paragraph')}
                  className="px-2 py-0.5 rounded-md bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[10px] text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)] transition-colors cursor-pointer"
                  title="Switch to Text"
                >
                  Text
                </button>

                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-2 py-0.5 rounded-md bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[10px] text-[var(--text)] border border-[var(--border)] transition-colors flex items-center gap-1 cursor-pointer active:scale-95"
                  title="Copy Code"
                >
                  <Icons.Copy size={10} />
                  <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                </button>

                {totalBlocks > 1 && (
                  <button
                    type="button"
                    onClick={onDeleteBlock}
                    className="p-1 rounded-md text-[var(--text-subtle)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Delete Code Block"
                  >
                    <Icons.Trash size={11} />
                  </button>
                )}
              </div>
            </div>

            {/* Code Textarea */}
            <textarea
              ref={inputRef}
              value={block.content}
              onChange={(e) => onChangeContent(e.target.value)}
              onKeyDown={handleCodeKeyDown}
              onFocus={onFocus}
              rows={Math.max(2, block.content.split('\n').length)}
              placeholder="// Write code here (supports JS, TS, Python, C++, etc.)..."
              className="w-full resize-none bg-transparent outline-none font-mono text-xs text-[var(--text)] placeholder-[var(--text-subtle)] leading-relaxed font-normal"
              spellCheck={false}
            />
          </div>
        ) : block.type === 'callout' ? (
          <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)]">
            <Icons.Info size={16} className="text-[var(--accent)] shrink-0 mt-0.5" />
            <textarea
              ref={inputRef}
              value={block.content}
              onChange={(e) => onChangeContent(e.target.value)}
              onKeyDown={onKeyDown}
              onSelect={onSelectText}
              onFocus={onFocus}
              rows={1}
              placeholder="Important note or callout info..."
              className={`w-full resize-none bg-transparent outline-none placeholder-[var(--text-subtle)] font-normal ${getBlockStyles()}`}
              spellCheck={false}
            />
          </div>
        ) : (
          <div className="flex items-start gap-2">
            {block.type === 'bulleted_list' && (
              <span className="text-[var(--text-subtle)] font-bold select-none text-base leading-snug">•</span>
            )}
            {block.type === 'numbered_list' && (
              <span className="text-[var(--text-subtle)] font-mono text-xs select-none pt-1">{index + 1}.</span>
            )}
            {block.type === 'todo' && (
              <input
                type="checkbox"
                className="mt-1 rounded accent-[var(--accent)] cursor-pointer"
              />
            )}
            <textarea
              ref={inputRef}
              value={block.content}
              onChange={(e) => onChangeContent(e.target.value)}
              onKeyDown={onKeyDown}
              onSelect={onSelectText}
              onFocus={onFocus}
              rows={1}
              placeholder={index === 0 ? 'Type text, or type "/" for commands and formatting...' : ''}
              className={`w-full resize-none bg-transparent outline-none placeholder-[var(--text-subtle)] font-normal ${getBlockStyles()}`}
              spellCheck={false}
            />
          </div>
        )}
      </div>
    </div>
  );
};
