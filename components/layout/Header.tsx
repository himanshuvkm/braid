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
    <header className="h-14 border-b border-[#e8e6e1] bg-[#faf9f6]/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-30">
      {/* Left: Mobile Menu Toggle & Title */}
      <div className="flex items-center gap-3 min-w-0">
        {onToggleMobileSidebar && (
          <IconButton
            aria-label="Open sidebar menu"
            variant="ghost"
            size="sm"
            onClick={onToggleMobileSidebar}
            className="md:hidden text-[#64635e] hover:text-[#191919]"
          >
            <Icons.Menu size={18} />
          </IconButton>
        )}

        <Link href="/dashboard" className="hidden sm:flex items-center gap-2 group">
          <div className="w-6 h-6 rounded-lg bg-[#191919] text-[#ffffff] flex items-center justify-center shadow-xs">
            <Icons.Logo size={13} />
          </div>
          <span className="font-bold text-sm tracking-tight text-[#191919]">Braid</span>
        </Link>

        {pageTitle && (
          <>
            <span className="hidden sm:inline text-[#d4d2cc] text-xs">/</span>
            <span className="text-xs sm:text-sm font-semibold text-[#191919] truncate">
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
            <Icons.Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9a9994] pointer-events-none" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-8 pr-7 py-1 rounded-lg bg-[#f4f3ef] border border-transparent focus:border-[#191919] focus:bg-[#ffffff] text-xs text-[#191919] placeholder-[#9a9994] outline-none transition-all focus:ring-2 focus:ring-[#191919]/10"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9a9994] hover:text-[#191919] p-0.5"
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
                className="ring-1 ring-[#e8e6e1] group-hover:ring-[#191919] transition-all"
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
