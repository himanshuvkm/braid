'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { BlockType } from '../../lib/document-model';
import { Icons } from '../ui/icons';

export interface SlashMenuItem {
  type: BlockType;
  label: string;
  description: string;
  category: 'Basic' | 'Lists' | 'Code' | 'Callout';
  codeLanguage?: string;
  shortcut?: string;
  icon?: React.ReactNode;
}

export const SLASH_MENU_ITEMS: SlashMenuItem[] = [
  {
    type: 'paragraph',
    label: 'Text',
    description: 'Start writing plain text.',
    category: 'Basic',
    shortcut: 'text',
    icon: <span className="font-serif font-bold text-xs">T</span>,
  },
  {
    type: 'heading1',
    label: 'Heading 1',
    description: 'Large section heading.',
    category: 'Basic',
    shortcut: '#',
    icon: <span className="font-bold text-xs">H1</span>,
  },
  {
    type: 'heading2',
    label: 'Heading 2',
    description: 'Medium section heading.',
    category: 'Basic',
    shortcut: '##',
    icon: <span className="font-bold text-xs">H2</span>,
  },
  {
    type: 'heading3',
    label: 'Heading 3',
    description: 'Small subsection heading.',
    category: 'Basic',
    shortcut: '###',
    icon: <span className="font-bold text-xs">H3</span>,
  },
  {
    type: 'bulleted_list',
    label: 'Bulleted List',
    description: 'Create a simple bulleted list.',
    category: 'Lists',
    shortcut: '-',
    icon: <Icons.List size={13} />,
  },
  {
    type: 'numbered_list',
    label: 'Numbered List',
    description: 'Create a numbered ordered list.',
    category: 'Lists',
    shortcut: '1.',
    icon: <Icons.ListOrdered size={13} />,
  },
  {
    type: 'todo',
    label: 'To-do item',
    description: 'Track tasks with checkboxes.',
    category: 'Lists',
    shortcut: '[]',
    icon: <Icons.CheckSquare size={13} />,
  },
  {
    type: 'quote',
    label: 'Quote',
    description: 'Capture a memorable quotation.',
    category: 'Basic',
    shortcut: '>',
    icon: <Icons.Quote size={13} />,
  },
  {
    type: 'callout',
    label: 'Callout',
    description: 'Highlight important notice or tip.',
    category: 'Callout',
    shortcut: '!',
    icon: <Icons.AlertCircle size={13} />,
  },
  {
    type: 'code',
    label: 'JavaScript / TypeScript',
    description: 'JS & TS syntax highlighting.',
    category: 'Code',
    codeLanguage: 'typescript',
    shortcut: '```ts',
    icon: <Icons.Code size={13} />,
  },
  {
    type: 'code',
    label: 'Python Code',
    description: 'Python script snippet.',
    category: 'Code',
    codeLanguage: 'python',
    shortcut: '```py',
    icon: <Icons.Code size={13} />,
  },
  {
    type: 'code',
    label: 'C++ Code',
    description: 'C++ system program snippet.',
    category: 'Code',
    codeLanguage: 'cpp',
    shortcut: '```cpp',
    icon: <Icons.Code size={13} />,
  },
  {
    type: 'code',
    label: 'Rust Code',
    description: 'Rust source code.',
    category: 'Code',
    codeLanguage: 'rust',
    shortcut: '```rs',
    icon: <Icons.Code size={13} />,
  },
  {
    type: 'code',
    label: 'SQL Query',
    description: 'Database query snippet.',
    category: 'Code',
    codeLanguage: 'sql',
    shortcut: '```sql',
    icon: <Icons.Code size={13} />,
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
      (item.codeLanguage && item.codeLanguage.toLowerCase().includes(cleanQuery)) ||
      (item.shortcut && item.shortcut.toLowerCase().includes(cleanQuery))
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
        className="absolute z-50 w-56 p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-modal text-xs text-[var(--text-subtle)] text-center animate-slide-down"
        style={position ? { top: position.top, left: position.left } : undefined}
      >
        No matching blocks for &quot;/{cleanQuery}&quot;
      </div>
    );
  }

  return (
    <div
      ref={menuRef}
      className="absolute z-50 w-64 max-h-72 overflow-y-auto p-1.5 rounded-2xl bg-[var(--surface)] border border-[var(--border-strong)] shadow-modal flex flex-col gap-0.5 text-[var(--text)] animate-slide-down"
      style={position ? { top: position.top, left: position.left } : undefined}
    >
      <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-subtle)]">
        Blocks &amp; Formatting
      </div>

      {filteredItems.map((item, index) => {
        const isSelected = index === selectedIndex;
        return (
          <button
            key={`${item.type}-${item.codeLanguage || ''}-${item.label}`}
            type="button"
            onClick={() => onSelect(item)}
            onMouseEnter={() => setRawIndex(index)}
            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left transition-all cursor-pointer ${
              isSelected
                ? 'bg-[var(--surface-hover)] text-[var(--text)]'
                : 'hover:bg-[var(--surface-muted)] text-[var(--text-muted)]'
            }`}
          >
            <div className="w-6 h-6 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] flex items-center justify-center text-xs text-[var(--text)] shrink-0">
              {item.icon || (item.type === 'code' ? '</>' : 'T')}
            </div>

            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text)]">{item.label}</span>
                {item.shortcut && (
                  <span className="text-[10px] font-mono text-[var(--text-subtle)] bg-[var(--surface-muted)] border border-[var(--border)] px-1 rounded">
                    {item.shortcut}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-[var(--text-subtle)] truncate">{item.description}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
