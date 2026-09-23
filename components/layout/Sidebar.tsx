'use client';

import React from 'react';
import Link from 'next/link';
import type { User } from '../../lib/db';
import { Icons } from '../ui/icons';
import { IconButton } from '../ui/icon-button';
import { Avatar } from '../ui/avatar';

export type DashboardFilter = 'all' | 'owned' | 'shared' | 'recent';

export interface SidebarProps {
  user: User;
  activeFilter: DashboardFilter;
  onFilterChange: (filter: DashboardFilter) => void;
  counts: {
    all: number;
    owned: number;
    shared: number;
    recent?: number;
  };
  onCreateDocument: () => void;
  isCreating?: boolean;
  onSignOut: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  activeFilter,
  onFilterChange,
  counts,
  onCreateDocument,
  isCreating = false,
  onSignOut,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          role="presentation"
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden transition-opacity duration-200"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 z-40 h-screen w-60 bg-[var(--paper)] border-r border-[var(--line)] flex flex-col justify-between p-4 transition-transform duration-200 ease-out select-none ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col gap-4">
          {/* Workspace Brand & Mobile Close */}
          <div className="flex items-center justify-between px-2 pt-1">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 group"
              onClick={onCloseMobile}
            >
              <div className="w-6 h-6 bg-[var(--accent)] text-white flex items-center justify-center">
                <Icons.Logo size={13} />
              </div>
              <span className="font-display text-lg tracking-tight text-[var(--ink)]">
                Braid Workspace
              </span>
            </Link>

            {onCloseMobile && (
              <IconButton
                aria-label="Close navigation sidebar"
                variant="ghost"
                size="sm"
                onClick={onCloseMobile}
                className="md:hidden text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                <Icons.X size={16} />
              </IconButton>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => {
                onCreateDocument();
                onCloseMobile?.();
              }}
              disabled={isCreating}
              className="w-full h-10 px-3 border border-[var(--accent)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-[10px] font-mono uppercase tracking-wider transition-colors flex items-center justify-between disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Icons.Plus size={14} className="text-white" />
                <span>{isCreating ? 'Creating...' : 'New document'}</span>
              </div>
              <span className="text-[10px] text-white/80 font-mono px-1 py-0.5 rounded bg-black/20">
                ⌘N
              </span>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1 text-xs" aria-label="Documents filter">
            <button
              type="button"
              onClick={() => {
                onFilterChange('all');
                onCloseMobile?.();
              }}
              className={`min-h-[38px] md:min-h-[34px] flex items-center gap-2.5 border-l-2 px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wide transition-colors cursor-pointer ${
                activeFilter === 'all'
                  ? 'border-l-[var(--accent)] bg-[var(--surface-muted)] text-[var(--ink)] font-semibold'
                  : 'border-l-transparent text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]'
              }`}
            >
              <Icons.Home size={14} className="shrink-0" />
              <span>All Documents</span>
              <span className="ml-auto text-[11px] text-[var(--text-subtle)] font-mono">
                {counts.all}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onFilterChange('owned');
                onCloseMobile?.();
              }}
              className={`min-h-[38px] md:min-h-[34px] flex items-center gap-2.5 border-l-2 px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wide transition-colors cursor-pointer ${
                activeFilter === 'owned'
                  ? 'border-l-[var(--accent)] bg-[var(--surface-muted)] text-[var(--ink)] font-semibold'
                  : 'border-l-transparent text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]'
              }`}
            >
              <Icons.Document size={14} className="shrink-0" />
              <span>My Documents</span>
              <span className="ml-auto text-[11px] text-[var(--text-subtle)] font-mono">
                {counts.owned}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onFilterChange('shared');
                onCloseMobile?.();
              }}
              className={`min-h-[38px] md:min-h-[34px] flex items-center gap-2.5 border-l-2 px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wide transition-colors cursor-pointer ${
                activeFilter === 'shared'
                  ? 'border-l-[var(--accent)] bg-[var(--surface-muted)] text-[var(--ink)] font-semibold'
                  : 'border-l-transparent text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]'
              }`}
            >
              <Icons.Users size={14} className="shrink-0" />
              <span>Shared with me</span>
              <span className="ml-auto text-[11px] text-[var(--text-subtle)] font-mono">
                {counts.shared}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onFilterChange('recent');
                onCloseMobile?.();
              }}
              className={`min-h-[38px] md:min-h-[34px] flex items-center gap-2.5 border-l-2 px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wide transition-colors cursor-pointer ${
                activeFilter === 'recent'
                  ? 'border-l-[var(--accent)] bg-[var(--surface-muted)] text-[var(--ink)] font-semibold'
                  : 'border-l-transparent text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]'
              }`}
            >
              <Icons.Clock size={14} className="shrink-0" />
              <span>Recent</span>
              {counts.recent !== undefined && (
                <span className="ml-auto text-[11px] text-[var(--text-subtle)] font-mono">
                  {counts.recent}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Footer Area: User Account Bar & Theme Toggler */}
        <div className="pt-3 border-t border-[var(--border)] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar name={user.name} size="sm" />
              <div className="flex flex-col min-w-0 text-left">
                <span className="text-xs font-semibold text-[var(--text)] truncate">{user.name}</span>
                <span className="text-[10px] text-[var(--text-subtle)] truncate">{user.email}</span>
              </div>
            </div>

            <IconButton
              aria-label="Sign out of account"
              variant="ghost"
              size="sm"
              onClick={onSignOut}
              className="text-[var(--text-muted)] hover:text-rose-400 hover:bg-[var(--surface-muted)]"
            >
              <Icons.LogOut size={14} />
            </IconButton>
          </div>
        </div>
      </aside>
    </>
  );
};
