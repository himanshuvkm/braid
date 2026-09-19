'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { BlockType } from '../../lib/document-model';
import { Icons } from '../ui/icons';

export interface SlashMenuItem {
  type: BlockType;
  label: string;
  description: string;
  codeLanguage?: string;
  shortcut?: string;
}

export const SLASH_MENU_ITEMS: SlashMenuItem[] = [
  {
    type: 'paragraph',
    label: 'Plain Text',
    description: 'Distraction-free text writing.',
    shortcut: 'text',
  },
  {
    type: 'code',
    label: 'JavaScript / TypeScript',
    description: 'Code block for JS / TS scripts.',
    codeLanguage: 'javascript',
    shortcut: '```js',
  },
  {
    type: 'code',
    label: 'C++ Code',
    description: 'Code block for C++ (cpp).',
    codeLanguage: 'cpp',
    shortcut: '```cpp',
  },
  {
    type: 'code',
    label: 'C Code',
    description: 'Code block for C language.',
    codeLanguage: 'c',
    shortcut: '```c',
  },
  {
    type: 'code',
    label: 'Java Code',
    description: 'Code block for Java.',
    codeLanguage: 'java',
    shortcut: '```java',
  },
  {
    type: 'code',
    label: 'Python Code',
    description: 'Code block for Python.',
    codeLanguage: 'python',
    shortcut: '```py',
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
      (item.codeLanguage && item.codeLanguage.toLowerCase().includes(cleanQuery))
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
        className="absolute z-50 w-56 p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 shadow-2xl text-xs text-neutral-500 text-center animate-slide-down"
        style={position ? { top: position.top, left: position.left } : undefined}
      >
        No matching options for &quot;/{cleanQuery}&quot;
      </div>
    );
  }

  return (
    <div
      ref={menuRef}
      className="absolute z-50 w-64 max-h-72 overflow-y-auto p-1 rounded-xl bg-neutral-900 border border-neutral-800 shadow-2xl flex flex-col gap-0.5 text-neutral-200 animate-slide-down"
      style={position ? { top: position.top, left: position.left } : undefined}
    >
      <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
        Insert Block
      </div>

      {filteredItems.map((item, index) => {
        const isSelected = index === selectedIndex;
        return (
          <button
            key={`${item.type}-${item.codeLanguage || ''}`}
            type="button"
            onClick={() => onSelect(item)}
            onMouseEnter={() => setRawIndex(index)}
            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
              isSelected ? 'bg-neutral-800 text-white' : 'hover:bg-neutral-800/60 text-neutral-200'
            }`}
          >
            <div className="w-6 h-6 rounded bg-neutral-950 border border-neutral-800 flex items-center justify-center font-mono text-[11px] text-neutral-300 shrink-0">
              {item.type === 'code' ? '</>' : 'T'}
            </div>

            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-200">{item.label}</span>
                {item.shortcut && (
                  <span className="text-[10px] font-mono text-neutral-500 bg-neutral-950 px-1 rounded">
                    {item.shortcut}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-neutral-500 truncate">{item.description}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
