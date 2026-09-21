'use client';

import React from 'react';
import type { Block } from '../../lib/document-model';
import { Icons } from '../ui/icons';

interface DocumentOutlineProps {
  blocks: Block[];
  onScrollToBlock: (blockId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const DocumentOutline: React.FC<DocumentOutlineProps> = ({
  blocks,
  onScrollToBlock,
  isOpen,
  onToggle,
}) => {
  const headings = blocks.filter(
    (b) => b.type === 'heading1' || b.type === 'heading2' || b.type === 'heading3'
  );

  if (headings.length === 0 && !isOpen) {
    return null;
  }

  return (
    <div className="flex flex-col select-none">
      <button
        type="button"
        onClick={onToggle}
        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
          isOpen
            ? 'bg-[var(--surface-hover)] text-[var(--text)] border-[var(--border-strong)]'
            : 'bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)] border-[var(--border)] hover:bg-[var(--surface-hover)]'
        }`}
        title="Toggle Table of Contents"
      >
        <Icons.List size={12} />
        <span>Outline {headings.length > 0 ? `(${headings.length})` : ''}</span>
      </button>

      {isOpen && (
        <div className="w-56 p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-modal flex flex-col gap-2 mt-2 animate-slide-down">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-subtle)]">
            Document Outline
          </div>

          {headings.length === 0 ? (
            <div className="text-xs text-[var(--text-subtle)] italic py-1">
              Add headings to see outline.
            </div>
          ) : (
            <div className="flex flex-col gap-0.5 max-h-72 overflow-y-auto pr-1">
              {headings.map((h) => {
                const indent =
                  h.type === 'heading1'
                    ? 'pl-1 font-semibold text-xs text-[var(--text)]'
                    : h.type === 'heading2'
                    ? 'pl-3 font-medium text-xs text-[var(--text-muted)]'
                    : 'pl-5 text-[11px] text-[var(--text-subtle)]';

                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => onScrollToBlock(h.id)}
                    className={`text-left hover:bg-[var(--surface-hover)] hover:text-[var(--text)] py-1 px-1.5 rounded-md transition-colors truncate cursor-pointer ${indent}`}
                    title={h.content}
                  >
                    {h.content || 'Untitled section'}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
