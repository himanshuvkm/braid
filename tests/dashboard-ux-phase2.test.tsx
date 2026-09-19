import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import Home from '../app/page';
import { DashboardClient } from '../app/dashboard/DashboardClient';
import type { User, ProjectWithRole } from '../lib/db';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => ({
    get: (key: string) => (key === 'from' ? '/dashboard' : null),
  }),
}));

describe('Phase 2 Product UX & Dashboard Verification', () => {
  const mockUser: User = {
    id: 'user-himanshu',
    name: 'Himanshu',
    email: 'himanshu@braid.app',
    avatar: 'H',
    created_at: Date.now(),
    updated_at: Date.now(),
  };

  const sampleProjects: ProjectWithRole[] = [
    {
      id: 'proj-1',
      name: 'Alpha Architecture Doc',
      content: 'This document explains the RGA CRDT tree architecture.',
      owner_id: 'user-himanshu',
      role: 'OWNER',
      owner_name: 'Himanshu',
      owner_email: 'himanshu@braid.app',
      created_at: 1000,
      updated_at: 5000,
    },
    {
      id: 'proj-2',
      name: 'Beta Design System',
      content: 'Design tokens and typography guidelines for teams.',
      owner_id: 'user-alice',
      role: 'EDITOR',
      owner_name: 'Alice',
      owner_email: 'alice@braid.app',
      created_at: 2000,
      updated_at: 4000,
    },
    {
      id: 'proj-3',
      name: 'Gamma Security Specs',
      content: 'WebSocket authentication and session token validation.',
      owner_id: 'user-bob',
      role: 'VIEWER',
      owner_name: 'Bob',
      owner_email: 'bob@braid.app',
      created_at: 3000,
      updated_at: 3000,
    },
  ];

  describe('Minimal Dark Instant Room Creator Experience', () => {
    it('renders clean minimal dark name prompt and instant room creation flow', () => {
      const html = renderToString(<Home />);
      expect(html).toContain('Braid');
      expect(html).toContain('Minimal real-time collaborative editor');
      expect(html).toContain('Your name...');
      expect(html).toContain('Start Writing');
      expect(html).toContain('Have a room code? Join room');
    });
  });

  describe('Dashboard Information Architecture & Toolbar', () => {
    it('renders dashboard header, workspace brand, counts, and sort dropdown', () => {
      const html = renderToString(
        <DashboardClient user={mockUser} initialProjects={sampleProjects} />
      );
      expect(html).toContain('Braid Workspace');
      expect(html).toContain('Welcome back');
      expect(html).toContain('Himanshu');
      expect(html).toContain('in your collaborative workspace');
      expect(html).toContain('Recently updated');
      expect(html).toContain('New document');
    });

    it('renders navigation filters for All Documents, My Documents, Shared with me, and Recent', () => {
      const html = renderToString(
        <DashboardClient user={mockUser} initialProjects={sampleProjects} />
      );
      expect(html).toContain('All Documents');
      expect(html).toContain('My Documents');
      expect(html).toContain('Shared with me');
      expect(html).toContain('Recent');
    });

    it('renders grid view with document cards, owner avatars, role badges, and actions', () => {
      const html = renderToString(
        <DashboardClient user={mockUser} initialProjects={sampleProjects} />
      );
      expect(html).toContain('Alpha Architecture Doc');
      expect(html).toContain('Beta Design System');
      expect(html).toContain('Gamma Security Specs');
      expect(html).toContain('OWNER');
      expect(html).toContain('EDITOR');
      expect(html).toContain('VIEWER');
    });

    it('renders permission-sensitive actions (delete only permitted for OWNER)', () => {
      const html = renderToString(
        <DashboardClient
          user={mockUser}
          initialProjects={[sampleProjects[0], sampleProjects[1]]}
        />
      );
      // OWNER item has delete button
      expect(html).toContain('aria-label="Delete document"');
    });
  });

  describe('Dashboard Empty States', () => {
    it('renders global empty state when user has no documents', () => {
      const html = renderToString(
        <DashboardClient user={mockUser} initialProjects={[]} />
      );
      expect(html).toContain('No documents yet');
      expect(html).toContain('Create your first document');
    });
  });
});
