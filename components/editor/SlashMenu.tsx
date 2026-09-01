'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { BlockType } from '../../lib/document-model';
import { Icons } from '../ui/icons';

export interface SlashMenuItem {
  type: BlockType;
  label: string;
  description: string;
  iconName: keyof typeof Icons | 'heading1' | 'heading2' | 'heading3';
  shortcut?: string;
  keywords: string[];
}

export const SLASH_MENU_ITEMS: SlashMenuItem[] = [
  {
    type: 'paragraph',
    label: 'Text',
    description: 'Plain text with normal paragraph spacing.',
    iconName: 'Document',
    shortcut: 'p',
    keywords: ['text', 'paragraph', 'plain'],
  },
  {
    type: 'heading1',
    label: 'Heading 1',
    description: 'Large section heading.',
    iconName: 'heading1',
    shortcut: '#',
    keywords: ['heading', 'h1', 'title', 'big'],
  },
  {
    type: 'heading2',
    label: 'Heading 2',
    description: 'Medium section heading.',
    iconName: 'heading2',
    shortcut: '##',
    keywords: ['heading', 'h2', 'subtitle', 'medium'],
  },
  {
    type: 'heading3',
    label: 'Heading 3',
    description: 'Small subsection heading.',
    iconName: 'heading3',
    shortcut: '###',
    keywords: ['heading', 'h3', 'subheading', 'small'],
  },
  {
    type: 'todo',
    label: 'To-do list',
    description: 'Track tasks with an interactive checkbox.',
    iconName: 'CheckSquare',
    shortcut: '[]',
    keywords: ['todo', 'task', 'check', 'checkbox', 'list'],
  },
  {
    type: 'bulleted_list',
    label: 'Bulleted list',
    description: 'Create a simple bulleted list.',
    iconName: 'List',
    shortcut: '-',
    keywords: ['bullet', 'list', 'unordered'],
  },
  {
    type: 'numbered_list',
    label: 'Numbered list',
    description: 'Create an ordered numbered list.',
    iconName: 'List',
    shortcut: '1.',
    keywords: ['number', 'list', 'ordered', 'num'],
  },
  {
    type: 'quote',
    label: 'Quote',
    description: 'Capture a quote or key takeaway.',
    iconName: 'Quote',
    shortcut: '>',
    keywords: ['quote', 'cite', 'blockquote'],
  },
  {
    type: 'callout',
    label: 'Callout',
    description: 'Highlight tips or important notes.',
    iconName: 'Sparkles',
    shortcut: '> 💡',
    keywords: ['callout', 'info', 'note', 'alert', 'warning', 'tip'],
  },
  {
    type: 'code',
    label: 'Code Block',
    description: 'Code snippets with syntax container.',
    iconName: 'Code',
    shortcut: '```',
    keywords: ['code', 'snippet', 'pre', 'typescript', 'javascript'],
  },
  {
    type: 'divider',
    label: 'Divider',
    description: 'Visually divide blocks with a hairline rule.',
    iconName: 'MoreHorizontal',
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
        className="absolute z-50 w-64 p-3 rounded-2xl bg-[#ffffff] border border-[#e8e6e1] shadow-modal text-xs text-[#64635e] text-center animate-slide-down"
        style={position ? { top: position.top, left: position.left } : undefined}
      >
        No matching blocks for &quot;/{cleanQuery}&quot;
      </div>
    );
  }

  return (
    <div
      ref={menuRef}
      className="absolute z-50 w-72 max-h-84 overflow-y-auto p-1.5 rounded-2xl bg-[#ffffff] border border-[#e8e6e1] shadow-modal flex flex-col gap-0.5 text-[#191919] animate-slide-down"
      style={position ? { top: position.top, left: position.left } : undefined}
    >
      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#9a9994]">
        Blocks & formatting
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
              isSelected ? 'bg-[#f4f3ef] text-[#191919]' : 'hover:bg-[#f4f3ef] text-[#191919]'
            }`}
          >
            {/* Icon */}
            <div className="w-8 h-8 rounded-lg bg-[#ffffff] border border-[#e8e6e1] flex items-center justify-center font-bold text-xs text-[#191919] shrink-0">
              {item.iconName === 'heading1' ? (
                <span className="font-bold text-xs">H1</span>
              ) : item.iconName === 'heading2' ? (
                <span className="font-bold text-xs">H2</span>
              ) : item.iconName === 'heading3' ? (
                <span className="font-bold text-xs">H3</span>
              ) : (
                React.createElement(Icons[item.iconName as keyof typeof Icons] || Icons.Document, { size: 14 })
              )}
            </div>

            {/* Content */}
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#191919]">{item.label}</span>
                {item.shortcut && (
                  <span className="text-[10px] font-mono text-[#9a9994] bg-[#f4f3ef] px-1.5 py-0.5 rounded">
                    {item.shortcut}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-[#64635e] truncate">{item.description}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
