'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { Block, BlockType } from '../../lib/document-model';
import { Icons } from '../ui/icons';

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
  onDeleteBlock,
  onConvertType,
  onOpenSlashMenu,
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
  }, [block.content]);

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
  const currentLang = block.codeLanguage || 'javascript';

  return (
    <div
      id={block.id}
      data-block-id={block.id}
      className={`group relative flex items-start gap-1.5 py-1 px-2 -mx-2 rounded-lg transition-colors ${
        isFocused ? 'bg-neutral-900/25' : 'hover:bg-neutral-900/15'
      }`}
      onDragOver={dragHandleProps?.onDragOver}
      onDrop={dragHandleProps?.onDrop}
    >
      {/* Left Block Actions - Minimal Hover */}
      <div className="flex items-center gap-1 pt-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity select-none shrink-0 w-12 justify-end">
        {isCode ? (
          <button
            type="button"
            onClick={() => onConvertType('paragraph')}
            className="px-1.5 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 text-[10px] text-neutral-400 hover:text-neutral-200 border border-neutral-800 transition-colors cursor-pointer"
            title="Switch to Plain Text"
          >
            Text
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onConvertType('code', 'javascript')}
            className="px-1.5 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 text-[10px] font-mono text-neutral-400 hover:text-neutral-200 border border-neutral-800 transition-colors cursor-pointer"
            title="Convert to Code Block"
          >
            &lt;/&gt;
          </button>
        )}
      </div>

      {/* Block Content: Code or Pure Text */}
      <div className="flex-1 min-w-0">
        {isCode ? (
          <div className="rounded-xl bg-[#111113] text-neutral-200 p-3 font-mono text-xs shadow-sm border border-neutral-800/80 flex flex-col gap-2">
            {/* Code Block Header with Language Selector & Actions */}
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800/70 select-none">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase text-neutral-500 font-semibold tracking-wider">
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
                  className="bg-neutral-900 text-neutral-200 text-xs font-mono rounded px-2 py-0.5 border border-neutral-800 outline-none hover:border-neutral-700 cursor-pointer transition-colors"
                >
                  {CODE_LANGUAGES.map((lang) => (
                    <option key={lang.value} value={lang.value} className="bg-neutral-900 text-neutral-200">
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onConvertType('paragraph')}
                  className="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 text-[10px] text-neutral-400 hover:text-neutral-200 border border-neutral-800 transition-colors cursor-pointer"
                  title="Switch to Text"
                >
                  Switch to Text
                </button>

                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 text-[10px] text-neutral-300 border border-neutral-800 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Copy Code"
                >
                  <span>{copiedCode ? '✓ Copied' : 'Copy'}</span>
                </button>

                {totalBlocks > 1 && (
                  <button
                    type="button"
                    onClick={onDeleteBlock}
                    className="p-1 rounded text-neutral-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
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
              placeholder="// Write code here (supports JS, TS, C, C++, Java, etc.)..."
              className="w-full resize-none bg-transparent outline-none font-mono text-xs text-neutral-200 placeholder-neutral-700 leading-relaxed font-normal"
              spellCheck={false}
            />
          </div>
        ) : (
          <textarea
            ref={inputRef}
            value={block.content}
            onChange={(e) => onChangeContent(e.target.value)}
            onKeyDown={onKeyDown}
            onSelect={onSelectText}
            onFocus={onFocus}
            rows={1}
            placeholder={index === 0 ? 'Type text, or ```js, ```cpp, ```c, ```java for code...' : ''}
            className="w-full resize-none bg-transparent outline-none text-sm text-neutral-200 placeholder-neutral-700 leading-relaxed font-normal"
            spellCheck={false}
          />
        )}
      </div>
    </div>
  );
};
