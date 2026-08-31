'use client';

import React from 'react';
import type { Block } from '../../lib/document-model';

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
      {/* Toggle button */}
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#666666] hover:text-[#000000] bg-[#faf8f5] hover:bg-[#ececf0] rounded-xl border border-[#e4e4e7] transition-colors shadow-sm w-fit mb-3"
        title="Toggle Table of Contents"
      >
        <span>📑</span>
        <span>Outline {headings.length > 0 ? `(${headings.length})` : ''}</span>
      </button>

      {/* Expanded Outline Sidebar */}
      {isOpen && (
        <div className="w-56 p-4 rounded-2xl bg-[#faf8f5] border border-[#e4e4e7] shadow-sm flex flex-col gap-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#666666]">
            Document Outline
          </div>

          {headings.length === 0 ? (
            <div className="text-xs text-[#666666] italic py-2">
              Add headings (H1, H2, H3) to see the document outline here.
            </div>
          ) : (
            <div className="flex flex-col gap-1 max-h-80 overflow-y-auto pr-1">
              {headings.map((h) => {
                const indent =
                  h.type === 'heading1' ? 'pl-1 font-bold text-xs' : h.type === 'heading2' ? 'pl-3 font-semibold text-xs' : 'pl-5 text-[11px]';

                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => onScrollToBlock(h.id)}
                    className={`text-left text-[#000000] hover:text-black hover:bg-[#ececf0] py-1 px-1.5 rounded-lg transition-colors truncate ${indent}`}
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
