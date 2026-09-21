'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Icons } from './icons';
import { useTheme } from './theme-provider';
import type { ProjectWithRole } from '../../lib/db';

export interface CommandPaletteItem {
  id: string;
  category: 'Documents' | 'Actions' | 'Preferences' | 'Navigation';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  shortcut?: string[];
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  projects?: ProjectWithRole[];
  onCreateDocument?: () => void;
  onToggleViewMode?: () => void;
  currentViewMode?: 'grid' | 'list';
}

export function CommandPalette({
  isOpen,
  onClose,
  projects = [],
  onCreateDocument,
  onToggleViewMode,
  currentViewMode,
}: CommandPaletteProps) {
  const router = useRouter();
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when opened & reset query
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const items: CommandPaletteItem[] = useMemo(() => {
    const list: CommandPaletteItem[] = [];

    // Document items
    if (projects && projects.length > 0) {
      projects.slice(0, 8).forEach((proj) => {
        list.push({
          id: `doc-${proj.id}`,
          category: 'Documents',
          title: proj.name || 'Untitled Document',
          subtitle: proj.role === 'OWNER' ? 'Owned by you' : 'Shared with you',
          icon: <Icons.Document size={16} className="text-[var(--accent)]" />,
          action: () => {
            router.push(`/project/${proj.id}`);
            onClose();
          },
        });
      });
    }

    // Action items
    if (onCreateDocument) {
      list.push({
        id: 'action-new-doc',
        category: 'Actions',
        title: 'Create New Document',
        subtitle: 'Start a blank collaborative document',
        icon: <Icons.Plus size={16} className="text-[var(--text-muted)]" />,
        shortcut: ['Cmd', 'N'],
        action: () => {
          onCreateDocument();
          onClose();
        },
      });
    }

    if (onToggleViewMode && currentViewMode) {
      list.push({
        id: 'action-toggle-view',
        category: 'Actions',
        title: `Switch to ${currentViewMode === 'grid' ? 'List' : 'Grid'} View`,
        subtitle: `Currently in ${currentViewMode} view`,
        icon: currentViewMode === 'grid' ? <Icons.List size={16} /> : <Icons.Grid size={16} />,
        shortcut: ['V'],
        action: () => {
          onToggleViewMode();
          onClose();
        },
      });
    }

    // Navigation items
    list.push({
      id: 'nav-dashboard',
      category: 'Navigation',
      title: 'Go to Dashboard',
      subtitle: 'View all documents and folders',
      icon: <Icons.Home size={16} className="text-[var(--text-muted)]" />,
      action: () => {
        router.push('/dashboard');
        onClose();
      },
    });

    // Theme / Preference items
    list.push({
      id: 'pref-toggle-theme',
      category: 'Preferences',
      title: `Toggle Theme (Currently ${theme === 'system' ? `System (${resolvedTheme})` : theme})`,
      subtitle: 'Switch between light and dark mode',
      icon: resolvedTheme === 'dark' ? <Icons.Sun size={16} className="text-amber-500" /> : <Icons.Moon size={16} />,
      shortcut: ['T'],
      action: () => {
        toggleTheme();
        onClose();
      },
    });

    list.push({
      id: 'pref-light-theme',
      category: 'Preferences',
      title: 'Set Light Theme',
      subtitle: 'Crisp bright workspace',
      icon: <Icons.Sun size={16} className="text-amber-500" />,
      action: () => {
        setTheme('light');
        onClose();
      },
    });

    list.push({
      id: 'pref-dark-theme',
      category: 'Preferences',
      title: 'Set Dark Theme',
      subtitle: 'Deep obsidian workspace',
      icon: <Icons.Moon size={16} className="text-neutral-400" />,
      action: () => {
        setTheme('dark');
        onClose();
      },
    });

    list.push({
      id: 'pref-system-theme',
      category: 'Preferences',
      title: 'Set System Theme',
      subtitle: 'Follow OS appearance settings',
      icon: <Icons.Monitor size={16} className="text-[var(--text-subtle)]" />,
      action: () => {
        setTheme('system');
        onClose();
      },
    });

    return list;
  }, [projects, onCreateDocument, onToggleViewMode, currentViewMode, router, onClose, theme, resolvedTheme, toggleTheme, setTheme]);

  // Filter items based on query
  const filteredItems = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q)
    );
  }, [items, query]);

  // Handle keyboard events inside command palette
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (filteredItems.length > 0 ? (prev + 1) % filteredItems.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (filteredItems.length > 0 ? (prev - 1 + filteredItems.length) % filteredItems.length : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const active = filteredItems[selectedIndex];
        if (active) {
          active.action();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onClose]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  // Group by category for visual hierarchy
  const categories = Array.from(new Set(filteredItems.map((i) => i.category)));

  let itemCounter = 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 px-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[var(--surface)] border border-[var(--border-strong)] rounded-2xl shadow-modal overflow-hidden animate-slide-down"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-[var(--border)] gap-3">
          <Icons.Search size={18} className="text-[var(--text-subtle)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or search documents..."
            className="flex-1 bg-transparent text-sm text-[var(--text)] placeholder-[var(--text-subtle)] outline-none border-none font-medium"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[11px] font-mono text-[var(--text-subtle)] bg-[var(--surface-muted)] border border-[var(--border)] rounded-md">
            <span>ESC</span>
          </kbd>
        </div>

        {/* Results list */}
        <div ref={listRef} className="max-h-80 overflow-y-auto p-2 divide-y divide-transparent">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--text-subtle)]">
              No results found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            categories.map((cat) => {
              const categoryItems = filteredItems.filter((i) => i.category === cat);
              return (
                <div key={cat} className="mb-2 last:mb-0">
                  <div className="px-3 py-1.5 text-[10px] font-semibold tracking-wider text-[var(--text-subtle)] uppercase">
                    {cat}
                  </div>
                  <div className="space-y-0.5">
                    {categoryItems.map((item) => {
                      const isSelected = itemCounter === selectedIndex;
                      const currentIndex = itemCounter;
                      itemCounter++;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          data-active={isSelected}
                          onClick={item.action}
                          onMouseEnter={() => setSelectedIndex(currentIndex)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-all ${
                            isSelected
                              ? 'bg-[var(--surface-hover)] text-[var(--text)]'
                              : 'text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--text)]">
                              {item.icon}
                            </span>
                            <div className="min-w-0">
                              <p className="font-medium truncate text-[var(--text)]">{item.title}</p>
                              {item.subtitle && (
                                <p className="text-[11px] text-[var(--text-subtle)] truncate">{item.subtitle}</p>
                              )}
                            </div>
                          </div>

                          {item.shortcut && (
                            <div className="flex items-center gap-1 shrink-0 ml-3">
                              {item.shortcut.map((key) => (
                                <kbd
                                  key={key}
                                  className="px-1.5 py-0.5 text-[10px] font-mono text-[var(--text-subtle)] bg-[var(--surface-muted)] border border-[var(--border)] rounded"
                                >
                                  {key}
                                </kbd>
                              ))}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="flex items-center justify-between px-4 py-2 bg-[var(--surface-muted)] border-t border-[var(--border)] text-[11px] text-[var(--text-subtle)]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 bg-[var(--surface)] border border-[var(--border)] rounded text-[10px]">↑</kbd>
              <kbd className="px-1 bg-[var(--surface)] border border-[var(--border)] rounded text-[10px]">↓</kbd>
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 bg-[var(--surface)] border border-[var(--border)] rounded text-[10px]">↵</kbd>
              <span>Select</span>
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="px-1 bg-[var(--surface)] border border-[var(--border)] rounded text-[10px]">⌘K</kbd>
            <span>Command Palette</span>
          </span>
        </div>
      </div>
    </div>
  );
}
