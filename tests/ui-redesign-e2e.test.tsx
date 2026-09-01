import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import Home from '../app/page';
import LoginPage from '../app/login/page';
import { DashboardClient } from '../app/dashboard/DashboardClient';
import { ProjectEditor } from '../components/project/ProjectEditor';
import { Editor } from '../components/editor/Editor';
import type { User, Project } from '../lib/db';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => ({
    get: (key: string) => (key === 'from' ? '/dashboard' : null),
  }),
}));

describe('Complete UI/UX Redesign Verification', () => {
  const mockUser: User = {
    id: 'user-himanshu',
    name: 'Himanshu',
    email: 'himanshu@braid.app',
    avatar: 'H',
    created_at: Date.now(),
    updated_at: Date.now(),
  };

  const mockProject: Project = {
    id: 'proj-demo-design',
    name: 'System Architecture and Design',
    content: '# System Architecture\n\nThis is a collaborative document.\n\n- [x] RGA Engine\n- [ ] Visual Refresh',
    owner_id: 'user-himanshu',
    created_at: Date.now(),
    updated_at: Date.now(),
  };

  it('renders redesigned Landing Page with SaaS hero, value prop, and bento card', () => {
    const html = renderToString(<Home />);
    expect(html).toContain('Braid');
    expect(html).toContain('Documents, together.');
    expect(html).toContain('Conflict-Free Real-Time Documents');
    expect(html).toContain('Create a Room');
    expect(html).toContain('Join a Room');
    expect(html).toContain('Product Roadmap.braid');
    expect(html).toContain('Pure Convergence Guarantee');
  });

  it('renders redesigned Login Page with tabbed auth and demo profiles', () => {
    const html = renderToString(<LoginPage />);
    expect(html).toContain('Welcome back');
    expect(html).toContain('Sign In');
    expect(html).toContain('Sign Up');
    expect(html).toContain('Email Address');
    expect(html).toContain('Alice');
    expect(html).toContain('Himanshu');
    expect(html).toContain('Bob');
  });

  it('renders redesigned Dashboard with workspace sidebar, documents grid, and stats', () => {
    const html = renderToString(
      <DashboardClient
        user={mockUser}
        initialProjects={[
          {
            ...mockProject,
            role: 'OWNER',
            owner_name: 'Himanshu',
            owner_email: 'himanshu@braid.app',
          },
        ]}
      />
    );
    expect(html).toContain('Braid Workspace');
    expect(html).toContain('Welcome back');
    expect(html).toContain('Himanshu');
    expect(html).toContain('All Documents');
    expect(html).toContain('My Documents');
    expect(html).toContain('Shared with me');
    expect(html).toContain('System Architecture and Design');
    expect(html).toContain('OWNER');
  });

  it('renders redesigned Project Editor with breadcrumbs, autosave status, and block controls', () => {
    const html = renderToString(
      <ProjectEditor project={mockProject} user={mockUser} role="OWNER" />
    );
    expect(html).toContain('Workspace');
    expect(html).toContain('System Architecture and Design');
    expect(html).toContain('Saved to DB');
    expect(html).toContain('Share');
    expect(html).toContain('Himanshu');
    expect(html).toContain('CRDT nodes');
  });

  it('renders direct room URL join gate when unauthenticated', () => {
    const html = renderToString(<Editor documentId="doc-test-join" />);
    expect(html).toContain('Join Room');
    expect(html).toContain('Live Collaborative Session');
    expect(html).toContain('doc-test-join');
    expect(html).toContain('Your Name');
  });
});
