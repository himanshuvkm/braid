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
        className={`fixed md:sticky top-0 z-40 h-screen w-64 bg-neutral-950 border-r border-neutral-800 flex flex-col justify-between p-4 transition-transform duration-200 ease-out select-none ${
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
              <div className="w-6 h-6 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-100 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <Icons.Logo size={13} />
              </div>
              <span className="font-bold text-sm tracking-tight text-neutral-200">
                Braid Workspace
              </span>
            </Link>

            {onCloseMobile && (
              <IconButton
                aria-label="Close navigation sidebar"
                variant="ghost"
                size="sm"
                onClick={onCloseMobile}
                className="md:hidden text-neutral-400 hover:text-neutral-100"
              >
                <Icons.X size={16} />
              </IconButton>
            )}
          </div>

          {/* Quick Create Action Button */}
          <button
            type="button"
            onClick={() => {
              onCreateDocument();
              onCloseMobile?.();
            }}
            disabled={isCreating}
            className="w-full h-10 px-3 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-200 text-xs font-semibold shadow-xs hover:shadow-sm transition-all flex items-center justify-between disabled:opacity-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Icons.Plus size={14} className="text-neutral-200" />
              <span>{isCreating ? 'Creating...' : 'New document'}</span>
            </div>
            <span className="text-[10px] text-neutral-500 font-mono px-1 py-0.5 rounded bg-neutral-950">
              ⌘N
            </span>
          </button>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1 text-xs" aria-label="Documents filter">
            <button
              type="button"
              onClick={() => {
                onFilterChange('all');
                onCloseMobile?.();
              }}
              className={`min-h-[38px] md:min-h-[34px] flex items-center gap-2.5 px-3 py-2 rounded-xl text-left font-medium transition-all cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-neutral-800 text-white shadow-xs font-semibold'
                  : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'
              }`}
            >
              <Icons.Home size={14} className="shrink-0" />
              <span>All Documents</span>
              <span className="ml-auto text-[11px] text-neutral-500 font-mono">
                {counts.all}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onFilterChange('owned');
                onCloseMobile?.();
              }}
              className={`min-h-[38px] md:min-h-[34px] flex items-center gap-2.5 px-3 py-2 rounded-xl text-left font-medium transition-all cursor-pointer ${
                activeFilter === 'owned'
                  ? 'bg-neutral-800 text-white shadow-xs font-semibold'
                  : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'
              }`}
            >
              <Icons.Document size={14} className="shrink-0" />
              <span>My Documents</span>
              <span className="ml-auto text-[11px] text-neutral-500 font-mono">
                {counts.owned}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onFilterChange('shared');
                onCloseMobile?.();
              }}
              className={`min-h-[38px] md:min-h-[34px] flex items-center gap-2.5 px-3 py-2 rounded-xl text-left font-medium transition-all cursor-pointer ${
                activeFilter === 'shared'
                  ? 'bg-neutral-800 text-white shadow-xs font-semibold'
                  : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'
              }`}
            >
              <Icons.Users size={14} className="shrink-0" />
              <span>Shared with me</span>
              <span className="ml-auto text-[11px] text-neutral-500 font-mono">
                {counts.shared}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onFilterChange('recent');
                onCloseMobile?.();
              }}
              className={`min-h-[38px] md:min-h-[34px] flex items-center gap-2.5 px-3 py-2 rounded-xl text-left font-medium transition-all cursor-pointer ${
                activeFilter === 'recent'
                  ? 'bg-neutral-800 text-white shadow-xs font-semibold'
                  : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'
              }`}
            >
              <Icons.Clock size={14} className="shrink-0" />
              <span>Recent</span>
              {counts.recent !== undefined && (
                <span className="ml-auto text-[11px] text-neutral-500 font-mono">
                  {counts.recent}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* User Account Bar & Sign Out */}
        <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar name={user.name} size="sm" />
            <div className="flex flex-col min-w-0 text-left">
              <span className="text-xs font-semibold text-neutral-200 truncate">{user.name}</span>
              <span className="text-[10px] text-neutral-500 truncate">{user.email}</span>
            </div>
          </div>

          <IconButton
            aria-label="Sign out of account"
            variant="ghost"
            size="sm"
            onClick={onSignOut}
            className="text-neutral-400 hover:text-rose-400 hover:bg-neutral-900"
          >
            <Icons.LogOut size={14} />
          </IconButton>
        </div>
      </aside>
    </>
  );
};
