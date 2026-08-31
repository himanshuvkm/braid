'use client';

import React from 'react';
import type { BlockType } from '../../lib/document-model';

interface FormatToolbarProps {
  position: { top: number; left: number };
  currentBlockType: BlockType;
  onFormat: (formatType: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code' | 'link') => void;
  onConvertBlockType: (newType: BlockType) => void;
}

export const FormatToolbar: React.FC<FormatToolbarProps> = ({
  position,
  currentBlockType,
  onFormat,
  onConvertBlockType,
}) => {
  return (
    <div
      className="absolute z-50 flex items-center gap-1 p-1 bg-[#000000] text-[#ffffff] rounded-xl shadow-2xl border border-neutral-800 text-xs select-none"
      style={{
        top: position.top - 48,
        left: Math.max(16, position.left - 120),
      }}
      onMouseDown={(e) => e.preventDefault()} // Prevent losing textarea selection focus
    >
      {/* Block Type Switcher */}
      <select
        value={currentBlockType}
        onChange={(e) => onConvertBlockType(e.target.value as BlockType)}
        className="bg-neutral-800 text-neutral-200 text-[11px] font-semibold rounded-lg px-2 py-1 outline-none cursor-pointer hover:bg-neutral-700 transition-colors"
      >
        <option value="paragraph">Text</option>
        <option value="heading1">H1 Heading</option>
        <option value="heading2">H2 Heading</option>
        <option value="heading3">H3 Heading</option>
        <option value="bulleted_list">Bullet List</option>
        <option value="numbered_list">Numbered List</option>
        <option value="todo">To-do</option>
        <option value="quote">Quote</option>
        <option value="callout">Callout</option>
        <option value="code">Code Block</option>
      </select>

      <div className="w-[1px] h-4 bg-neutral-700 mx-0.5" />

      {/* Bold */}
      <button
        type="button"
        onClick={() => onFormat('bold')}
        className="w-7 h-7 flex items-center justify-center font-black rounded-lg hover:bg-neutral-800 transition-colors"
        title="Bold (Cmd+B)"
      >
        B
      </button>

      {/* Italic */}
      <button
        type="button"
        onClick={() => onFormat('italic')}
        className="w-7 h-7 flex items-center justify-center italic font-serif rounded-lg hover:bg-neutral-800 transition-colors text-sm"
        title="Italic (Cmd+I)"
      >
        I
      </button>

      {/* Underline */}
      <button
        type="button"
        onClick={() => onFormat('underline')}
        className="w-7 h-7 flex items-center justify-center underline rounded-lg hover:bg-neutral-800 transition-colors"
        title="Underline (Cmd+U)"
      >
        U
      </button>

      {/* Strikethrough */}
      <button
        type="button"
        onClick={() => onFormat('strikethrough')}
        className="w-7 h-7 flex items-center justify-center line-through rounded-lg hover:bg-neutral-800 transition-colors text-xs"
        title="Strikethrough"
      >
        S
      </button>

      {/* Inline Code */}
      <button
        type="button"
        onClick={() => onFormat('code')}
        className="w-7 h-7 flex items-center justify-center font-mono text-[11px] rounded-lg hover:bg-neutral-800 transition-colors"
        title="Inline Code (`)"
      >
        &lt;/&gt;
      </button>

      {/* Link */}
      <button
        type="button"
        onClick={() => onFormat('link')}
        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-neutral-800 transition-colors text-xs"
        title="Link (Cmd+K)"
      >
        🔗
      </button>
    </div>
  );
};
