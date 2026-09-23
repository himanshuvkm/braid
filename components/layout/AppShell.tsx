'use client';

import React, { useState } from 'react';
import type { User } from '../../lib/db';
import { Header } from './Header';
import { Sidebar, type DashboardFilter } from './Sidebar';

export interface AppShellProps {
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
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  pageTitle?: string;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  user,
  activeFilter,
  onFilterChange,
  counts,
  onCreateDocument,
  isCreating = false,
  onSignOut,
  searchQuery,
  onSearchChange,
  pageTitle,
  children,
}) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] flex selection:bg-[var(--accent-subtle)] selection:text-[var(--ink)] transition-colors">
      {/* Sidebar Navigation */}
      <Sidebar
        user={user}
        activeFilter={activeFilter}
        onFilterChange={onFilterChange}
        counts={counts}
        onCreateDocument={onCreateDocument}
        isCreating={isCreating}
        onSignOut={onSignOut}
        isOpenMobile={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          user={user}
          pageTitle={pageTitle}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          onCreateDocument={onCreateDocument}
          isCreating={isCreating}
          onSignOut={onSignOut}
          onToggleMobileSidebar={() => setMobileSidebarOpen(true)}
        />

        <div className="flex-1 flex flex-col min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
};
