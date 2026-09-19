'use client';

import React from 'react';
import Link from 'next/link';
import type { User } from '../../lib/db';
import { Icons } from '../ui/icons';
import { Button } from '../ui/button';
import { IconButton } from '../ui/icon-button';
import { Avatar } from '../ui/avatar';
import { Dropdown } from '../ui/dropdown';

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
    <header className="h-14 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-30">
      {/* Left: Mobile Menu Toggle & Title */}
      <div className="flex items-center gap-3 min-w-0">
        {onToggleMobileSidebar && (
          <IconButton
            aria-label="Open sidebar menu"
            variant="ghost"
            size="sm"
            onClick={onToggleMobileSidebar}
            className="md:hidden text-neutral-400 hover:text-neutral-100"
          >
            <Icons.Menu size={18} />
          </IconButton>
        )}

        <Link href="/dashboard" className="hidden sm:flex items-center gap-2 group">
          <div className="w-6 h-6 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-100 flex items-center justify-center shadow-xs">
            <Icons.Logo size={13} />
          </div>
          <span className="font-bold text-sm tracking-tight text-neutral-200">Braid</span>
        </Link>

        {pageTitle && (
          <>
            <span className="hidden sm:inline text-neutral-700 text-xs">/</span>
            <span className="text-xs sm:text-sm font-semibold text-neutral-200 truncate">
              {pageTitle}
            </span>
          </>
        )}
      </div>

      {/* Right: Search, Create Action & User Dropdown */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Search Bar */}
        {onSearchChange && (
          <div className="relative w-36 sm:w-56 md:w-64">
            <Icons.Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-8 pr-7 py-1 rounded-lg bg-neutral-900 border border-neutral-800 focus:border-neutral-600 focus:bg-neutral-950 text-xs text-neutral-200 placeholder-neutral-500 outline-none transition-all focus:ring-2 focus:ring-neutral-700/30"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-200 p-0.5"
              >
                <Icons.X size={12} />
              </button>
            )}
          </div>
        )}

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
                className="ring-1 ring-neutral-700 group-hover:ring-neutral-400 transition-all"
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
