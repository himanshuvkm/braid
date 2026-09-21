'use client';

import React from 'react';
import Link from 'next/link';
import type { User } from '../../lib/db';
import { Icons } from '../ui/icons';
import { Button } from '../ui/button';
import { IconButton } from '../ui/icon-button';
import { Avatar } from '../ui/avatar';
import { Dropdown } from '../ui/dropdown';
import { ThemeToggle } from '../ui/theme-toggle';

export interface HeaderProps {
  user: User;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onCreateDocument?: () => void;
  isCreating?: boolean;
  onSignOut?: () => void;
  onToggleMobileSidebar?: () => void;
  onOpenCommandPalette?: () => void;
  pageTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  searchQuery = '',
  onSearchChange,
  onCreateDocument,
  isCreating = false,
  onSignOut,
  onToggleMobileSidebar,
  onOpenCommandPalette,
  pageTitle,
}) => {
  return (
    <header className="h-14 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-30 transition-colors">
      {/* Left: Mobile Menu Toggle & Title */}
      <div className="flex items-center gap-3 min-w-0">
        {onToggleMobileSidebar && (
          <IconButton
            aria-label="Open sidebar menu"
            variant="ghost"
            size="sm"
            onClick={onToggleMobileSidebar}
            className="md:hidden text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            <Icons.Menu size={18} />
          </IconButton>
        )}

        <Link href="/dashboard" className="hidden sm:flex items-center gap-2 group">
          <div className="w-6 h-6 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--text)] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
            <Icons.Logo size={13} />
          </div>
          <span className="font-bold text-sm tracking-tight text-[var(--text)]">Braid</span>
        </Link>

        {pageTitle && (
          <>
            <span className="hidden sm:inline text-[var(--text-subtle)] text-xs">/</span>
            <span className="text-xs sm:text-sm font-semibold text-[var(--text)] truncate">
              {pageTitle}
            </span>
          </>
        )}
      </div>

      {/* Right: Search, Command Palette Pill, Theme Toggle, Create Action & User Dropdown */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Command Palette Trigger Button */}
        {onOpenCommandPalette ? (
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] text-xs text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--border-strong)] transition-all cursor-pointer group"
          >
            <Icons.Search size={13} className="text-[var(--text-subtle)] group-hover:text-[var(--text)]" />
            <span className="text-[11px] font-medium">Search or jump to...</span>
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--text-subtle)]">
              ⌘K
            </kbd>
          </button>
        ) : onSearchChange ? (
          <div className="relative w-36 sm:w-56 md:w-64">
            <Icons.Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-subtle)] pointer-events-none" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-8 pr-7 py-1 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] focus:border-[var(--border-strong)] focus:bg-[var(--surface)] text-xs text-[var(--text)] placeholder-[var(--text-subtle)] outline-none transition-all focus:ring-2 focus:ring-[var(--accent)]/20"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-subtle)] hover:text-[var(--text)] p-0.5"
              >
                <Icons.X size={12} />
              </button>
            )}
          </div>
        ) : null}

        {/* Theme Toggle Button */}
        <ThemeToggle />

        {/* Create Document Quick Button */}
        {onCreateDocument && (
          <Button
            variant="primary"
            size="sm"
            onClick={onCreateDocument}
            isLoading={isCreating}
            leftIcon={<Icons.Plus size={13} />}
            className="hidden sm:inline-flex"
          >
            New document
          </Button>
        )}

        {/* User Profile Avatar with Dropdown */}
        <Dropdown
          align="right"
          trigger={
            <div className="flex items-center gap-2 pl-1 cursor-pointer group">
              <Avatar
                name={user.name}
                size="sm"
                className="ring-1 ring-[var(--border)] group-hover:ring-[var(--border-strong)] transition-all"
              />
            </div>
          }
          items={[
            {
              id: 'profile-info',
              label: `${user.name} (${user.email})`,
              onClick: () => {},
              disabled: true,
            },
            'divider',
            {
              id: 'sign-out',
              label: 'Sign Out',
              icon: <Icons.LogOut size={13} />,
              danger: true,
              onClick: () => onSignOut?.(),
            },
          ]}
        />
      </div>
    </header>
  );
};
