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
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border transition-colors shadow-xs w-fit ${
          isOpen
            ? 'bg-[#191919] text-[#ffffff] border-[#191919]'
            : 'bg-[#ffffff] text-[#64635e] hover:text-[#191919] border-[#e8e6e1] hover:bg-[#f4f3ef]'
        }`}
        title="Toggle Table of Contents"
      >
        <Icons.List size={13} />
        <span>Outline {headings.length > 0 ? `(${headings.length})` : ''}</span>
      </button>

      {isOpen && (
        <div className="w-60 p-4 rounded-2xl bg-[#ffffff] border border-[#e8e6e1] shadow-card flex flex-col gap-2.5 mt-2 animate-slide-down">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#9a9994]">
            Document Outline
          </div>

          {headings.length === 0 ? (
            <div className="text-xs text-[#9a9994] italic py-1">
              Add headings to see outline.
            </div>
          ) : (
            <div className="flex flex-col gap-1 max-h-72 overflow-y-auto pr-1">
              {headings.map((h) => {
                const indent =
                  h.type === 'heading1'
                    ? 'pl-1 font-semibold text-xs text-[#191919]'
                    : h.type === 'heading2'
                    ? 'pl-3 font-medium text-xs text-[#64635e]'
                    : 'pl-5 text-[11px] text-[#9a9994]';

                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => onScrollToBlock(h.id)}
                    className={`text-left hover:bg-[#f4f3ef] hover:text-[#191919] py-1 px-1.5 rounded-lg transition-colors truncate ${indent}`}
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
