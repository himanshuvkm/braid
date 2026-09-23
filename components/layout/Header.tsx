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
  pageTitle,
}) => {
  return (
    <header className="h-14 border-b border-[var(--line)] bg-[var(--paper)] px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-3 sticky top-0 z-30 transition-colors">
      {/* Left: Mobile Menu Toggle & Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
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
          <div className="w-6 h-6 bg-[var(--accent)] text-white flex items-center justify-center">
            <Icons.Logo size={13} />
          </div>
          <span className="font-display text-lg tracking-tight text-[var(--ink)]">Braid</span>
        </Link>

        {pageTitle && (
          <>
            <span className="hidden sm:inline text-[var(--text-subtle)] text-xs">/</span>
            <span className="font-display text-base sm:text-lg text-[var(--ink)] truncate max-w-[120px] sm:max-w-xs">
              {pageTitle}
            </span>
          </>
        )}
      </div>

      {/* Right: Search, Theme Toggle, Create Action & User Dropdown */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {onSearchChange ? (
          <div className="relative w-28 xs:w-36 sm:w-56 md:w-64">
            <Icons.Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-subtle)] pointer-events-none" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full border-b border-[var(--line)] bg-transparent pl-8 pr-7 py-2 text-xs text-[var(--ink)] placeholder-[var(--text-subtle)] outline-none transition-all focus:border-[var(--accent)] focus:ring-0"
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

        {/* Theme Toggle Button (desktop only - on mobile accessible via sidebar) */}
        <div className="hidden sm:flex items-center">
          <ThemeToggle />
        </div>

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
