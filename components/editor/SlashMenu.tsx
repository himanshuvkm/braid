'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { BlockType } from '../../lib/document-model';

export interface SlashMenuItem {
  type: BlockType;
  label: string;
  description: string;
  icon: string;
  shortcut?: string;
  keywords: string[];
}

export const SLASH_MENU_ITEMS: SlashMenuItem[] = [
  {
    type: 'paragraph',
    label: 'Text',
    description: 'Just start writing with plain text.',
    icon: '¶',
    shortcut: 'p',
    keywords: ['text', 'paragraph', 'plain'],
  },
  {
    type: 'heading1',
    label: 'Heading 1',
    description: 'Big section heading.',
    icon: 'H1',
    shortcut: '#',
    keywords: ['heading', 'h1', 'title', 'big'],
  },
  {
    type: 'heading2',
    label: 'Heading 2',
    description: 'Medium section heading.',
    icon: 'H2',
    shortcut: '##',
    keywords: ['heading', 'h2', 'subtitle', 'medium'],
  },
  {
    type: 'heading3',
    label: 'Heading 3',
    description: 'Small section heading.',
    icon: 'H3',
    shortcut: '###',
    keywords: ['heading', 'h3', 'subheading', 'small'],
  },
  {
    type: 'todo',
    label: 'To-do list',
    description: 'Track tasks with an interactive checkbox.',
    icon: '☑',
    shortcut: '[]',
    keywords: ['todo', 'task', 'check', 'checkbox', 'list'],
  },
  {
    type: 'bulleted_list',
    label: 'Bulleted list',
    description: 'Create a simple bulleted list.',
    icon: '•',
    shortcut: '-',
    keywords: ['bullet', 'list', 'unordered'],
  },
  {
    type: 'numbered_list',
    label: 'Numbered list',
    description: 'Create a list with numbering.',
    icon: '1.',
    shortcut: '1.',
    keywords: ['number', 'list', 'ordered', 'num'],
  },
  {
    type: 'quote',
    label: 'Quote',
    description: 'Capture a quote or important statement.',
    icon: '❝',
    shortcut: '>',
    keywords: ['quote', 'cite', 'blockquote'],
  },
  {
    type: 'callout',
    label: 'Callout',
    description: 'Make writing stand out with an icon card.',
    icon: '💡',
    shortcut: '> 💡',
    keywords: ['callout', 'info', 'note', 'alert', 'warning', 'tip'],
  },
  {
    type: 'code',
    label: 'Code Block',
    description: 'Capture code snippets with language formatting.',
    icon: '</>',
    shortcut: '```',
    keywords: ['code', 'snippet', 'pre', 'typescript', 'javascript'],
  },
  {
    type: 'divider',
    label: 'Divider',
    description: 'Visually divide blocks with a horizontal rule.',
    icon: '—',
    shortcut: '---',
    keywords: ['divider', 'hr', 'line', 'separator'],
  },
];

interface SlashMenuProps {
  query: string;
  onSelect: (item: SlashMenuItem) => void;
  onClose: () => void;
  position?: { top: number; left: number };
}

export const SlashMenu: React.FC<SlashMenuProps> = ({
  query,
  onSelect,
  onClose,
  position,
}) => {
  const [rawIndex, setRawIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const cleanQuery = query.toLowerCase().replace(/^\//, '').trim();

  const filteredItems = SLASH_MENU_ITEMS.filter((item) => {
    if (!cleanQuery) return true;
    return (
      item.label.toLowerCase().includes(cleanQuery) ||
      item.description.toLowerCase().includes(cleanQuery) ||
      item.keywords.some((k) => k.toLowerCase().includes(cleanQuery))
    );
  });

  const selectedIndex = Math.min(rawIndex, Math.max(0, filteredItems.length - 1));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setRawIndex((prev) => (filteredItems.length > 0 ? (prev + 1) % filteredItems.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setRawIndex((prev) => (filteredItems.length > 0 ? (prev - 1 + filteredItems.length) % filteredItems.length : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          onSelect(filteredItems[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredItems, selectedIndex, onSelect, onClose]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (filteredItems.length === 0) {
    return (
      <div
        ref={menuRef}
        className="absolute z-50 w-64 p-3 rounded-2xl bg-[#ffffff] border border-[#e4e4e7] shadow-xl text-xs text-[#666666] text-center"
        style={position ? { top: position.top, left: position.left } : undefined}
      >
        No matching blocks found for &quot;/{cleanQuery}&quot;
      </div>
    );
  }

  return (
    <div
      ref={menuRef}
      className="absolute z-50 w-72 max-h-80 overflow-y-auto p-2 rounded-2xl bg-[#ffffff] border border-[#e4e4e7] shadow-2xl flex flex-col gap-1 text-[#000000]"
      style={position ? { top: position.top, left: position.left } : undefined}
    >
      <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#666666]">
        Basic Blocks
      </div>

      {filteredItems.map((item, index) => {
        const isSelected = index === selectedIndex;
        return (
          <button
            key={item.type}
            type="button"
            onClick={() => onSelect(item)}
            onMouseEnter={() => setRawIndex(index)}
            className={`flex items-center gap-3 px-2.5 py-2 rounded-xl text-left transition-all ${
              isSelected ? 'bg-[#faf8f5] ring-1 ring-[#e4e4e7]' : 'hover:bg-[#faf8f5]'
            }`}
          >
            {/* Icon */}
            <div className="w-8 h-8 rounded-lg bg-[#ececf0] flex items-center justify-center font-bold text-xs text-[#000000] shrink-0">
              {item.icon}
            </div>

            {/* Title & Description */}
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#000000]">{item.label}</span>
                {item.shortcut && (
                  <span className="text-[10px] font-mono text-[#666666] bg-[#ececf0] px-1.5 py-0.2 rounded">
                    {item.shortcut}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-[#666666] truncate">{item.description}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
