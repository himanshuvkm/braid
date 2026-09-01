'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { Block, BlockType } from '../../lib/document-model';
import { Icons } from '../ui/icons';

interface BlockItemProps {
  block: Block;
  index: number;
  totalBlocks: number;
  isFocused: boolean;
  onFocus: () => void;
  onChangeContent: (content: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
  onSelectText: (e: React.SyntheticEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
  onToggleTodo?: () => void;
  onInsertBelow?: (type?: BlockType) => void;
  onDeleteBlock: () => void;
  onDuplicateBlock: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onConvertType: (type: BlockType) => void;
  onOpenSlashMenu: (anchorRect: DOMRect) => void;
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
  onKeyDown,
  onSelectText,
  onToggleTodo,
  onDeleteBlock,
  onDuplicateBlock,
  onMoveUp,
  onMoveDown,
  onConvertType,
  onOpenSlashMenu,
  dragHandleProps,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea height to fit content
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [block.content]);

  // Focus effect when selected
  useEffect(() => {
    if (isFocused && inputRef.current && document.activeElement !== inputRef.current) {
      inputRef.current.focus();
    }
  }, [isFocused]);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  const handleCopyCode = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(block.content);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handlePlusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    onOpenSlashMenu(rect);
  };

  return (
    <div
      id={block.id}
      data-block-id={block.id}
      className={`group relative flex items-start gap-1.5 py-1 px-2 -mx-2 rounded-xl transition-colors ${
        isFocused ? 'bg-[#f4f3ef]/50' : 'hover:bg-[#f4f3ef]/30'
      }`}
      onDragOver={dragHandleProps?.onDragOver}
      onDrop={dragHandleProps?.onDrop}
    >
      {/* Left Block Hover Handle Rail */}
      <div className="flex items-center gap-0.5 pt-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity select-none shrink-0 w-11 justify-end">
        {/* Quick Add Button */}
        <button
          type="button"
          onClick={handlePlusClick}
          className="w-5 h-5 flex items-center justify-center rounded-md text-[#9a9994] hover:text-[#191919] hover:bg-[#eeede8] transition-colors"
          title="Add block below (or type /)"
        >
          <Icons.Plus size={12} />
        </button>

        {/* Drag Handle & Menu Trigger */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            draggable={dragHandleProps?.draggable}
            onDragStart={dragHandleProps?.onDragStart}
            onClick={() => setShowMenu((prev) => !prev)}
            className="w-5 h-5 flex items-center justify-center rounded-md text-[#9a9994] hover:text-[#191919] hover:bg-[#eeede8] transition-colors cursor-grab active:cursor-grabbing"
            title="Options & Turn into"
          >
            <Icons.MoreHorizontal size={13} />
          </button>

          {/* Block Actions Menu */}
          {showMenu && (
            <div className="absolute left-0 top-full mt-1 w-48 p-2 rounded-2xl bg-[#ffffff] border border-[#e8e6e1] shadow-modal z-40 flex flex-col gap-1 text-xs text-[#191919] animate-slide-down">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#9a9994] px-2 py-1">
                Block Actions
              </div>

              <button
                type="button"
                onClick={() => {
                  onDuplicateBlock();
                  setShowMenu(false);
                }}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#f4f3ef] text-left transition-colors"
              >
                <Icons.Copy size={13} className="text-[#64635e]" />
                <span>Duplicate</span>
              </button>

              {index > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    onMoveUp();
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#f4f3ef] text-left transition-colors"
                >
                  <Icons.ArrowRight size={13} className="-rotate-90 text-[#64635e]" />
                  <span>Move Up</span>
                </button>
              )}

              {index < totalBlocks - 1 && (
                <button
                  type="button"
                  onClick={() => {
                    onMoveDown();
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#f4f3ef] text-left transition-colors"
                >
                  <Icons.ArrowRight size={13} className="rotate-90 text-[#64635e]" />
                  <span>Move Down</span>
                </button>
              )}

              <div className="h-[1px] bg-[#e8e6e1] my-1" />

              <div className="text-[10px] font-bold uppercase tracking-wider text-[#9a9994] px-2 py-0.5">
                Turn into
              </div>
              <div className="grid grid-cols-2 gap-1 px-1">
                <button
                  type="button"
                  onClick={() => {
                    onConvertType('paragraph');
                    setShowMenu(false);
                  }}
                  className="px-2 py-1 rounded-md text-[11px] hover:bg-[#f4f3ef] text-left"
                >
                  Text
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onConvertType('heading1');
                    setShowMenu(false);
                  }}
                  className="px-2 py-1 rounded-md text-[11px] font-bold hover:bg-[#f4f3ef] text-left"
                >
                  H1
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onConvertType('heading2');
                    setShowMenu(false);
                  }}
                  className="px-2 py-1 rounded-md text-[11px] font-bold hover:bg-[#f4f3ef] text-left"
                >
                  H2
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onConvertType('heading3');
                    setShowMenu(false);
                  }}
                  className="px-2 py-1 rounded-md text-[11px] font-bold hover:bg-[#f4f3ef] text-left"
                >
                  H3
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onConvertType('bulleted_list');
                    setShowMenu(false);
                  }}
                  className="px-2 py-1 rounded-md text-[11px] hover:bg-[#f4f3ef] text-left"
                >
                  Bullet
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onConvertType('todo');
                    setShowMenu(false);
                  }}
                  className="px-2 py-1 rounded-md text-[11px] hover:bg-[#f4f3ef] text-left"
                >
                  To-do
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onConvertType('quote');
                    setShowMenu(false);
                  }}
                  className="px-2 py-1 rounded-md text-[11px] hover:bg-[#f4f3ef] text-left"
                >
                  Quote
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onConvertType('callout');
                    setShowMenu(false);
                  }}
                  className="px-2 py-1 rounded-md text-[11px] hover:bg-[#f4f3ef] text-left"
                >
                  Callout
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onConvertType('code');
                    setShowMenu(false);
                  }}
                  className="px-2 py-1 rounded-md text-[11px] font-mono hover:bg-[#f4f3ef] text-left col-span-2"
                >
                  Code
                </button>
              </div>

              <div className="h-[1px] bg-[#e8e6e1] my-1" />

              <button
                type="button"
                onClick={() => {
                  onDeleteBlock();
                  setShowMenu(false);
                }}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-red-50 text-red-600 text-left transition-colors"
              >
                <Icons.Trash size={13} />
                <span>Delete Block</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Block Content Container */}
      <div className="flex-1 min-w-0">
        {block.type === 'divider' ? (
          <div className="py-3 cursor-pointer group/divider" onClick={onFocus}>
            <hr className="border-t border-[#e8e6e1] group-hover/divider:border-[#191919] transition-colors" />
          </div>
        ) : block.type === 'heading1' ? (
          <textarea
            ref={inputRef}
            value={block.content}
            onChange={(e) => onChangeContent(e.target.value)}
            onKeyDown={onKeyDown}
            onSelect={onSelectText}
            onFocus={onFocus}
            rows={1}
            placeholder="Heading 1"
            className="w-full resize-none bg-transparent outline-none font-bold text-3xl tracking-tight text-[#191919] placeholder-[#9a9994]/40 leading-snug"
            spellCheck={false}
          />
        ) : block.type === 'heading2' ? (
          <textarea
            ref={inputRef}
            value={block.content}
            onChange={(e) => onChangeContent(e.target.value)}
            onKeyDown={onKeyDown}
            onSelect={onSelectText}
            onFocus={onFocus}
            rows={1}
            placeholder="Heading 2"
            className="w-full resize-none bg-transparent outline-none font-bold text-2xl tracking-tight text-[#191919] placeholder-[#9a9994]/40 leading-snug"
            spellCheck={false}
          />
        ) : block.type === 'heading3' ? (
          <textarea
            ref={inputRef}
            value={block.content}
            onChange={(e) => onChangeContent(e.target.value)}
            onKeyDown={onKeyDown}
            onSelect={onSelectText}
            onFocus={onFocus}
            rows={1}
            placeholder="Heading 3"
            className="w-full resize-none bg-transparent outline-none font-semibold text-lg tracking-tight text-[#191919] placeholder-[#9a9994]/40 leading-snug"
            spellCheck={false}
          />
        ) : block.type === 'todo' ? (
          <div className="flex items-start gap-2.5">
            <button
              type="button"
              onClick={onToggleTodo}
              className={`w-4 h-4 mt-1 rounded-md border flex items-center justify-center text-[10px] font-bold transition-all shrink-0 ${
                block.checked
                  ? 'bg-[#191919] border-[#191919] text-[#ffffff]'
                  : 'bg-[#ffffff] border-[#9a9994] hover:border-[#191919]'
              }`}
            >
              {block.checked && <Icons.Check size={10} />}
            </button>
            <textarea
              ref={inputRef}
              value={block.content}
              onChange={(e) => onChangeContent(e.target.value)}
              onKeyDown={onKeyDown}
              onSelect={onSelectText}
              onFocus={onFocus}
              rows={1}
              placeholder="To-do"
              className={`flex-1 resize-none bg-transparent outline-none text-sm text-[#191919] placeholder-[#9a9994]/40 leading-relaxed ${
                block.checked ? 'line-through text-[#9a9994]' : ''
              }`}
              spellCheck={false}
            />
          </div>
        ) : block.type === 'bulleted_list' ? (
          <div className="flex items-start gap-2.5">
            <span className="text-base leading-tight text-[#64635e] select-none pt-0.5">•</span>
            <textarea
              ref={inputRef}
              value={block.content}
              onChange={(e) => onChangeContent(e.target.value)}
              onKeyDown={onKeyDown}
              onSelect={onSelectText}
              onFocus={onFocus}
              rows={1}
              placeholder="List item"
              className="flex-1 resize-none bg-transparent outline-none text-sm text-[#191919] placeholder-[#9a9994]/40 leading-relaxed"
              spellCheck={false}
            />
          </div>
        ) : block.type === 'numbered_list' ? (
          <div className="flex items-start gap-2">
            <span className="text-xs font-semibold text-[#64635e] select-none pt-1 min-w-[1.2rem]">
              {index + 1}.
            </span>
            <textarea
              ref={inputRef}
              value={block.content}
              onChange={(e) => onChangeContent(e.target.value)}
              onKeyDown={onKeyDown}
              onSelect={onSelectText}
              onFocus={onFocus}
              rows={1}
              placeholder="List item"
              className="flex-1 resize-none bg-transparent outline-none text-sm text-[#191919] placeholder-[#9a9994]/40 leading-relaxed"
              spellCheck={false}
            />
          </div>
        ) : block.type === 'quote' ? (
          <div className="pl-3.5 border-l-2 border-[#191919] py-0.5">
            <textarea
              ref={inputRef}
              value={block.content}
              onChange={(e) => onChangeContent(e.target.value)}
              onKeyDown={onKeyDown}
              onSelect={onSelectText}
              onFocus={onFocus}
              rows={1}
              placeholder="Empty quote"
              className="w-full resize-none bg-transparent outline-none text-sm text-[#64635e] italic placeholder-[#9a9994]/40 leading-relaxed"
              spellCheck={false}
            />
          </div>
        ) : block.type === 'callout' ? (
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#f4f3ef] border border-[#e8e6e1]">
            <span className="text-base select-none mt-0.5">
              {block.calloutVariant === 'warning'
                ? '⚠️'
                : block.calloutVariant === 'success'
                ? '✅'
                : block.calloutVariant === 'info'
                ? 'ℹ️'
                : '💡'}
            </span>
            <textarea
              ref={inputRef}
              value={block.content}
              onChange={(e) => onChangeContent(e.target.value)}
              onKeyDown={onKeyDown}
              onSelect={onSelectText}
              onFocus={onFocus}
              rows={1}
              placeholder="Callout text..."
              className="flex-1 resize-none bg-transparent outline-none text-sm text-[#191919] placeholder-[#9a9994]/40 leading-relaxed font-medium"
              spellCheck={false}
            />
          </div>
        ) : block.type === 'code' ? (
          <div className="rounded-2xl bg-[#1e1e1e] text-[#f4f4f5] p-4 font-mono text-xs shadow-sm border border-neutral-800">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-700/80 select-none">
              <span className="text-[11px] font-semibold text-neutral-400">
                {block.codeLanguage || 'typescript'}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-2 py-0.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-[10px] text-neutral-300 transition-colors flex items-center gap-1"
              >
                <span>{copiedCode ? '✓ Copied' : 'Copy'}</span>
              </button>
            </div>
            <textarea
              ref={inputRef}
              value={block.content}
              onChange={(e) => onChangeContent(e.target.value)}
              onKeyDown={onKeyDown}
              onSelect={onSelectText}
              onFocus={onFocus}
              rows={Math.max(2, block.content.split('\n').length)}
              placeholder="// Write code here..."
              className="w-full resize-none bg-transparent outline-none font-mono text-xs text-[#f4f4f5] placeholder-neutral-500 leading-relaxed"
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
            placeholder={index === 0 ? 'Type / for commands...' : ''}
            className="w-full resize-none bg-transparent outline-none text-sm text-[#191919] placeholder-[#9a9994]/40 leading-relaxed font-normal"
            spellCheck={false}
          />
        )}
      </div>
    </div>
  );
};
