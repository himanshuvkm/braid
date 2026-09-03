import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Button } from '../components/ui/button';
import { IconButton } from '../components/ui/icon-button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { Badge } from '../components/ui/badge';
import { Avatar } from '../components/ui/avatar';
import { Tooltip } from '../components/ui/tooltip';
import { Dropdown } from '../components/ui/dropdown';
import { Modal } from '../components/ui/modal';
import { Spinner } from '../components/ui/spinner';
import { Skeleton } from '../components/ui/skeleton';
import { Divider } from '../components/ui/divider';
import { EmptyState } from '../components/ui/empty-state';
import { AppShell } from '../components/layout/AppShell';
import { Icons } from '../components/ui/icons';
import type { User } from '../lib/db';

describe('Design System UI Primitives and Shell Verification', () => {
  const mockUser: User = {
    id: 'user-himanshu',
    name: 'Himanshu',
    email: 'himanshu@braid.app',
    avatar: 'H',
    created_at: Date.now(),
    updated_at: Date.now(),
  };

  it('renders Button with variants, sizes, and loading state', () => {
    const primaryHtml = renderToString(<Button variant="primary">Click Me</Button>);
    expect(primaryHtml).toContain('Click Me');
    expect(primaryHtml).toContain('bg-[#191919]');

    const loadingHtml = renderToString(<Button isLoading>Submit</Button>);
    expect(loadingHtml).toContain('animate-spin');
    expect(loadingHtml).toContain('disabled');

    const iconHtml = renderToString(
      <Button leftIcon={<Icons.Plus size={14} />} rightIcon={<Icons.ArrowRight size={14} />}>
        New
      </Button>
    );
    expect(iconHtml).toContain('New');
  });

  it('renders IconButton with accessible aria-label', () => {
    const html = renderToString(
      <IconButton aria-label="Close dialog">
        <Icons.X size={14} />
      </IconButton>
    );
    expect(html).toContain('aria-label="Close dialog"');
  });

  it('renders accessible Input with label, error, and hint', () => {
    const html = renderToString(
      <Input
        id="test-input"
        label="Workspace Name"
        hint="Unique workspace identifier"
        error="Name is already taken"
      />
    );
    expect(html).toContain('Workspace Name');
    expect(html).toContain('for="test-input"');
    expect(html).toContain('Name is already taken');
    expect(html).toContain('aria-invalid="true"');
  });

  it('renders Textarea with label and accessible error', () => {
    const html = renderToString(
      <Textarea id="test-textarea" label="Notes" error="Too long" rows={4} />
    );
    expect(html).toContain('Notes');
    expect(html).toContain('Too long');
    expect(html).toContain('rows="4"');
  });

  it('renders Select with options and chevron icon', () => {
    const html = renderToString(
      <Select label="Role">
        <option value="EDITOR">Editor</option>
        <option value="VIEWER">Viewer</option>
      </Select>
    );
    expect(html).toContain('Role');
    expect(html).toContain('Editor');
    expect(html).toContain('Viewer');
  });

  it('renders Checkbox with label and description', () => {
    const html = renderToString(
      <Checkbox label="Enable CRDT Logging" description="Writes trace logs to disk" />
    );
    expect(html).toContain('Enable CRDT Logging');
    expect(html).toContain('Writes trace logs to disk');
  });

  it('renders Badge with variants and dot indicator', () => {
    const html = renderToString(<Badge variant="accent" dot>Featured</Badge>);
    expect(html).toContain('Featured');
    expect(html).toContain('bg-[#d95338]');
  });

  it('renders Avatar with initials and custom color', () => {
    const html = renderToString(<Avatar name="Alice" color="#3b82f6" size="md" />);
    expect(html).toContain('A');
    expect(html).toContain('title="Alice"');
  });

  it('renders Tooltip and Dropdown primitives', () => {
    const tooltipHtml = renderToString(
      <Tooltip content="Helper message">
        <button type="button">Hover</button>
      </Tooltip>
    );
    expect(tooltipHtml).toContain('Hover');

    const dropdownHtml = renderToString(
      <Dropdown
        trigger={<button type="button">Menu</button>}
        items={[
          { id: 'opt-1', label: 'Settings', onClick: vi.fn() },
          'divider',
          { id: 'opt-2', label: 'Delete', danger: true, onClick: vi.fn() },
        ]}
      />
    );
    expect(dropdownHtml).toContain('Menu');
  });

  it('renders Modal dialog with ARIA attributes and title', () => {
    const html = renderToString(
      <Modal isOpen={true} onClose={vi.fn()} title="Confirm Deletion" description="Are you sure?">
        <div>Modal Body Content</div>
      </Modal>
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('Confirm Deletion');
    expect(html).toContain('Are you sure?');
    expect(html).toContain('Modal Body Content');
  });

  it('renders EmptyState, Spinner, Skeleton, and Divider', () => {
    const emptyHtml = renderToString(
      <EmptyState
        title="No items found"
        description="Try searching for something else"
        action={<Button>Create</Button>}
      />
    );
    expect(emptyHtml).toContain('No items found');
    expect(emptyHtml).toContain('Try searching for something else');
    expect(emptyHtml).toContain('Create');

    const spinnerHtml = renderToString(<Spinner size="lg" />);
    expect(spinnerHtml).toContain('animate-spin');

    const skeletonHtml = renderToString(<Skeleton className="h-6 w-32" />);
    expect(skeletonHtml).toContain('animate-pulse');

    const dividerHtml = renderToString(<Divider label="or continue with" />);
    expect(dividerHtml).toContain('or continue with');
  });

  it('renders Header, Sidebar, and AppShell layout components', () => {
    const shellHtml = renderToString(
      <AppShell
        user={mockUser}
        activeFilter="all"
        onFilterChange={vi.fn()}
        counts={{ all: 5, owned: 3, shared: 2 }}
        onCreateDocument={vi.fn()}
        onSignOut={vi.fn()}
        searchQuery="Architecture"
        onSearchChange={vi.fn()}
        pageTitle="Workspace Overview"
      >
        <div>Content Inside AppShell</div>
      </AppShell>
    );

    expect(shellHtml).toContain('Braid Workspace');
    expect(shellHtml).toContain('All Documents');
    expect(shellHtml).toContain('My Documents');
    expect(shellHtml).toContain('Shared with me');
    expect(shellHtml).toContain('Himanshu');
    expect(shellHtml).toContain('himanshu@braid.app');
    expect(shellHtml).toContain('Content Inside AppShell');
  });
});
