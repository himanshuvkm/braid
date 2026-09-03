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
          className="fixed inset-0 bg-[#191919]/30 backdrop-blur-xs z-40 md:hidden transition-opacity duration-200"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 z-40 h-screen w-64 bg-[#f4f3ef] border-r border-[#e8e6e1] flex flex-col justify-between p-4 transition-transform duration-200 ease-out select-none ${
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
              <div className="w-6 h-6 rounded-lg bg-[#191919] text-[#ffffff] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <Icons.Logo size={13} />
              </div>
              <span className="font-bold text-sm tracking-tight text-[#191919]">
                Braid Workspace
              </span>
            </Link>

            {onCloseMobile && (
              <IconButton
                aria-label="Close navigation sidebar"
                variant="ghost"
                size="sm"
                onClick={onCloseMobile}
                className="md:hidden text-[#64635e] hover:text-[#191919]"
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
            className="w-full h-10 px-3 rounded-xl bg-[#ffffff] border border-[#e8e6e1] hover:border-[#d4d2cc] text-[#191919] text-xs font-semibold shadow-xs hover:shadow-sm transition-all flex items-center justify-between disabled:opacity-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#191919]/20"
          >
            <div className="flex items-center gap-2">
              <Icons.Plus size={14} className="text-[#191919]" />
              <span>{isCreating ? 'Creating...' : 'New document'}</span>
            </div>
            <span className="text-[10px] text-[#9a9994] font-mono px-1 py-0.5 rounded bg-[#f4f3ef]">
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
              className={`min-h-[38px] md:min-h-[34px] flex items-center gap-2.5 px-3 py-2 rounded-xl text-left font-medium transition-all ${
                activeFilter === 'all'
                  ? 'bg-[#ffffff] text-[#191919] shadow-xs font-semibold'
                  : 'text-[#64635e] hover:bg-[#eeede8] hover:text-[#191919]'
              }`}
            >
              <Icons.Home size={14} className="shrink-0" />
              <span>All Documents</span>
              <span className="ml-auto text-[11px] text-[#9a9994] font-mono">
                {counts.all}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onFilterChange('owned');
                onCloseMobile?.();
              }}
              className={`min-h-[38px] md:min-h-[34px] flex items-center gap-2.5 px-3 py-2 rounded-xl text-left font-medium transition-all ${
                activeFilter === 'owned'
                  ? 'bg-[#ffffff] text-[#191919] shadow-xs font-semibold'
                  : 'text-[#64635e] hover:bg-[#eeede8] hover:text-[#191919]'
              }`}
            >
              <Icons.Document size={14} className="shrink-0" />
              <span>My Documents</span>
              <span className="ml-auto text-[11px] text-[#9a9994] font-mono">
                {counts.owned}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onFilterChange('shared');
                onCloseMobile?.();
              }}
              className={`min-h-[38px] md:min-h-[34px] flex items-center gap-2.5 px-3 py-2 rounded-xl text-left font-medium transition-all ${
                activeFilter === 'shared'
                  ? 'bg-[#ffffff] text-[#191919] shadow-xs font-semibold'
                  : 'text-[#64635e] hover:bg-[#eeede8] hover:text-[#191919]'
              }`}
            >
              <Icons.Users size={14} className="shrink-0" />
              <span>Shared with me</span>
              <span className="ml-auto text-[11px] text-[#9a9994] font-mono">
                {counts.shared}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onFilterChange('recent');
                onCloseMobile?.();
              }}
              className={`min-h-[38px] md:min-h-[34px] flex items-center gap-2.5 px-3 py-2 rounded-xl text-left font-medium transition-all ${
                activeFilter === 'recent'
                  ? 'bg-[#ffffff] text-[#191919] shadow-xs font-semibold'
                  : 'text-[#64635e] hover:bg-[#eeede8] hover:text-[#191919]'
              }`}
            >
              <Icons.Clock size={14} className="shrink-0" />
              <span>Recent</span>
              {counts.recent !== undefined && (
                <span className="ml-auto text-[11px] text-[#9a9994] font-mono">
                  {counts.recent}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* User Account Bar & Sign Out */}
        <div className="pt-3 border-t border-[#e8e6e1] flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar name={user.name} size="sm" />
            <div className="flex flex-col min-w-0 text-left">
              <span className="text-xs font-semibold text-[#191919] truncate">{user.name}</span>
              <span className="text-[10px] text-[#9a9994] truncate">{user.email}</span>
            </div>
          </div>

          <IconButton
            aria-label="Sign out of account"
            variant="ghost"
            size="sm"
            onClick={onSignOut}
            className="text-[#64635e] hover:text-[#191919] hover:bg-[#eeede8]"
          >
            <Icons.LogOut size={14} />
          </IconButton>
        </div>
      </aside>
    </>
  );
};
