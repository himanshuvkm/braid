'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { User, ProjectWithRole } from '../../lib/db';
import { DOCUMENT_TEMPLATES, type TemplateItem } from '../../lib/templates';
import { Icons } from '../../components/ui/icons';
import { Button } from '../../components/ui/button';
import { IconButton } from '../../components/ui/icon-button';
import { Badge } from '../../components/ui/badge';
import { Avatar } from '../../components/ui/avatar';
import { Modal } from '../../components/ui/modal';
import { Input } from '../../components/ui/input';
import { Dropdown } from '../../components/ui/dropdown';
import { EmptyState } from '../../components/ui/empty-state';
import { useToast } from '../../components/ui/toast';
import { AppShell } from '../../components/layout/AppShell';
import { ShareModal } from '../../components/ui/share-modal';
import type { DashboardFilter } from '../../components/layout/Sidebar';

interface DashboardClientProps {
  user: User;
  initialProjects: ProjectWithRole[];
}

export type SortOption = 'updated' | 'created' | 'alphabetical';
export type ViewMode = 'grid' | 'list';

function formatRelativeTime(timestamp: number) {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function cleanPreview(content: string): string {
  if (!content) return 'Empty document...';
  const stripped = content
    .replace(/^#+\s*/gm, '')
    .replace(/\[([ xX])\]\s*/g, '')
    .replace(/[`*_\~]/g, '')
    .trim();
  return stripped.slice(0, 140) || 'Empty document...';
}

export function DashboardClient({ user, initialProjects }: DashboardClientProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [projects, setProjects] = useState<ProjectWithRole[]>(initialProjects);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<DashboardFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('updated');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('braid:view_mode');
        if (stored === 'grid' || stored === 'list') {
          return stored;
        }
      } catch {}
    }
    return 'grid';
  });
  const [isCreating, setIsCreating] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  // Modals state
  const [shareProject, setShareProject] = useState<ProjectWithRole | null>(null);
  const [renameProject, setRenameProject] = useState<ProjectWithRole | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSetViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('braid:view_mode', mode);
    } catch {}
  };

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      router.push('/login');
    }
  };

  const handleCreateProject = useCallback(
    async (template?: TemplateItem) => {
      setIsCreating(true);
      try {
        const name = template ? template.title : 'Untitled Document';
        const content = template ? template.content : undefined;

        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, content }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create document');

        toast('Document created');
        router.push(`/${data.project.id}`);
      } catch (err: unknown) {
        toast(err instanceof Error ? err.message : 'Create failed', 'error');
        setIsCreating(false);
      }
    },
    [router, toast]
  );

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameProject || !renameInput.trim()) return;

    try {
      const res = await fetch(`/api/projects/${renameProject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to rename');

      setProjects((prev) =>
        prev.map((p) =>
          p.id === renameProject.id
            ? { ...p, name: renameInput.trim(), updated_at: Date.now() }
            : p
        )
      );
      toast('Document renamed');
      setRenameProject(null);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Rename failed', 'error');
    }
  };

  const handleDuplicate = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to duplicate');

      setProjects((prev) => [
        {
          ...data.project,
          role: 'OWNER',
          owner_name: user.name,
          owner_email: user.email,
        },
        ...prev,
      ]);
      toast('Document duplicated');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Duplicate failed', 'error');
    }
  };

  const handleOpenShare = (project: ProjectWithRole, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setShareProject(project);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteProjectId) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/projects/${deleteProjectId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');

      setProjects((prev) => prev.filter((p) => p.id !== deleteProjectId));
      toast('Document deleted');
      setDeleteProjectId(null);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Delete failed', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      if (activeFilter === 'owned' && project.role !== 'OWNER') return false;
      if (activeFilter === 'shared' && project.role === 'OWNER') return false;
      if (activeFilter === 'recent') {
        const threshold = 3 * 24 * 60 * 60 * 1000;
        if (project.updated_at && project.created_at && project.updated_at < project.created_at - threshold) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = project.name.toLowerCase().includes(q);
        const matchContent = project.content?.toLowerCase().includes(q);
        const matchOwner = project.owner_name?.toLowerCase().includes(q);
        if (!matchTitle && !matchContent && !matchOwner) return false;
      }

      return true;
    });
  }, [projects, activeFilter, searchQuery]);

  // Sorted projects
  const sortedProjects = useMemo(() => {
    const list = [...filteredProjects];
    if (sortBy === 'updated') {
      list.sort((a, b) => b.updated_at - a.updated_at);
    } else if (sortBy === 'created') {
      list.sort((a, b) => b.created_at - a.created_at);
    } else if (sortBy === 'alphabetical') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [filteredProjects, sortBy]);

  // Global keyboard shortcuts: Cmd+N for new doc, j/k to navigate list
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n' && !isInput) {
        e.preventDefault();
        handleCreateProject();
        return;
      }

      if (!isInput && !shareProject && !renameProject && !deleteProjectId) {
        if (e.key === 'j' || e.key === 'ArrowDown') {
          e.preventDefault();
          setHighlightedIndex((prev) => Math.min(prev + 1, sortedProjects.length - 1));
        } else if (e.key === 'k' || e.key === 'ArrowUp') {
          e.preventDefault();
          setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && highlightedIndex >= 0 && sortedProjects[highlightedIndex]) {
          e.preventDefault();
          router.push(`/${sortedProjects[highlightedIndex].id}`);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCreateProject, shareProject, renameProject, deleteProjectId, highlightedIndex, sortedProjects, router]);

  // Counts for sidebar
  const counts = useMemo(() => {
    return {
      all: projects.length,
      owned: projects.filter((p) => p.role === 'OWNER').length,
      shared: projects.filter((p) => p.role !== 'OWNER').length,
      recent: projects.length,
    };
  }, [projects]);

  const pageTitle =
    activeFilter === 'all'
      ? 'All Documents'
      : activeFilter === 'owned'
      ? 'My Documents'
      : activeFilter === 'shared'
      ? 'Shared with me'
      : 'Recent';

  const sortLabels: Record<SortOption, string> = {
    updated: 'Recently updated',
    created: 'Recently created',
    alphabetical: 'Alphabetical',
  };

  return (
    <AppShell
      user={user}
      activeFilter={activeFilter}
      onFilterChange={setActiveFilter}
      counts={counts}
      onCreateDocument={() => handleCreateProject()}
      isCreating={isCreating}
      onSignOut={handleSignOut}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      pageTitle={pageTitle}
    >
      <main className="editorial-grid p-4 sm:p-8 lg:p-10 max-w-[1440px] w-full mx-auto flex flex-col gap-6 sm:gap-8 flex-1">
        {/* Obsidian Studio Greeting & Workspace Summary Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-y border-[var(--line)] bg-[var(--paper)] py-6 sm:py-8 relative overflow-hidden">
          <div className="flex items-center gap-4 z-10">
            <Avatar name={user.name} size="lg" className="ring-2 ring-[var(--accent)]/40 shrink-0" />
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--accent)]">01 / Your workspace</span>
              <h1 className="font-display text-3xl font-normal tracking-tight text-[var(--ink)] sm:text-4xl">
                Welcome back, {user.name}
              </h1>
              <p className="text-xs text-[var(--muted)]">
                {projects.length} {projects.length === 1 ? 'document' : 'documents'} in your collaborative workspace
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto z-10">
            <Button
              variant="primary"
              size="md"
              onClick={() => handleCreateProject()}
              isLoading={isCreating}
              leftIcon={<Icons.Plus size={14} />}
              className="glow-accent"
            >
              New document
            </Button>
          </div>
        </div>

        {/* Starter Templates Quick-Launch Strip */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
              02 / Quick start templates
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border-l border-t border-[var(--line)]">
            {DOCUMENT_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => handleCreateProject(tmpl)}
                disabled={isCreating}
                className="bg-[var(--surface)] p-4 text-left flex flex-col gap-2 border-r border-b border-[var(--line)] hover:border-[var(--accent)] transition-colors cursor-pointer group"
              >
                <div className="w-7 h-7 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] flex items-center justify-center text-[var(--text)] group-hover:scale-105 group-hover:bg-[var(--accent-subtle)] group-hover:text-[var(--accent)] transition-all">
                  {tmpl.id === 'code' ? (
                    <Icons.Code size={14} />
                  ) : tmpl.id === 'rfc' ? (
                    <Icons.Cpu size={14} />
                  ) : tmpl.id === 'meeting' ? (
                    <Icons.Users size={14} />
                  ) : (
                    <Icons.Document size={14} />
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-xs text-[var(--text)] group-hover:text-[var(--accent)] truncate transition-colors">
                    {tmpl.title}
                  </span>
                  <span className="text-[10px] text-[var(--text-subtle)] line-clamp-1 mt-0.5">
                    {tmpl.description}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Workspace Toolbar: Search / Filter summary, Sort dropdown, and Grid/List toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-y border-[var(--line)] py-3">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[var(--ink)]">
            <span>{pageTitle}</span>
            <span className="text-[11px] text-[var(--text-subtle)] font-normal">
              ({sortedProjects.length})
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Sort Dropdown */}
            <Dropdown
              align="right"
              trigger={
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-muted)] border border-[var(--border)] transition-all cursor-pointer"
                >
                  <Icons.ArrowUpDown size={12} className="text-[var(--text-subtle)]" />
                  <span>{sortLabels[sortBy]}</span>
                  <Icons.ChevronDown size={11} className="text-[var(--text-subtle)]" />
                </button>
              }
              items={[
                {
                  id: 'sort-updated',
                  label: 'Recently updated',
                  onClick: () => setSortBy('updated'),
                },
                {
                  id: 'sort-created',
                  label: 'Recently created',
                  onClick: () => setSortBy('created'),
                },
                {
                  id: 'sort-alpha',
                  label: 'Alphabetical',
                  onClick: () => setSortBy('alphabetical'),
                },
              ]}
            />

            {/* Grid vs List View Toggle */}
            <div className="flex items-center rounded-lg bg-[var(--surface-muted)] p-0.5 border border-[var(--border)]">
              <button
                type="button"
                aria-label="Grid view"
                onClick={() => handleSetViewMode('grid')}
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs'
                    : 'text-[var(--text-subtle)] hover:text-[var(--text)]'
                }`}
              >
                <Icons.Grid size={13} />
              </button>
              <button
                type="button"
                aria-label="List view"
                onClick={() => handleSetViewMode('list')}
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs'
                    : 'text-[var(--text-subtle)] hover:text-[var(--text)]'
                }`}
              >
                <Icons.List size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Content Area: Grid View, List View, or Empty State */}
        {sortedProjects.length === 0 ? (
          searchQuery ? (
            <EmptyState
              icon={<Icons.Search size={20} />}
              title="No documents matched your search"
              description={`No documents found matching "${searchQuery}". Check for typos or try a different keyword.`}
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  leftIcon={<Icons.X size={12} />}
                >
                  Clear search
                </Button>
              }
            />
          ) : activeFilter !== 'all' ? (
            <EmptyState
              icon={
                activeFilter === 'shared' ? (
                  <Icons.Users size={20} />
                ) : activeFilter === 'recent' ? (
                  <Icons.Clock size={20} />
                ) : (
                  <Icons.Document size={20} />
                )
              }
              title={
                activeFilter === 'shared'
                  ? 'No shared documents'
                  : activeFilter === 'recent'
                  ? 'No recent activity'
                  : 'No documents in this view'
              }
              description={
                activeFilter === 'shared'
                  ? 'When team members invite you to collaborate, documents will appear here.'
                  : activeFilter === 'recent'
                  ? 'Documents you update will appear here in reverse chronological order.'
                  : 'You have not created any documents yet.'
              }
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setActiveFilter('all')}
                >
                  View all documents
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<Icons.Document size={20} />}
              title="No documents yet"
              description="Start writing in real time with Notion-style blocks and conflict-free collaboration."
              action={
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => handleCreateProject()}
                  isLoading={isCreating}
                  leftIcon={<Icons.Plus size={14} />}
                >
                  Create your first document
                </Button>
              }
            />
          )
        ) : viewMode === 'grid' ? (
          /* Grid View with Obsidian Studio glass cards */
          <div className="grid grid-cols-1 gap-px border border-[var(--line)] bg-[var(--line)] md:grid-cols-2 lg:grid-cols-3">
            {sortedProjects.map((project, idx) => {
              const isHighlighted = idx === highlightedIndex;
              return (
                <div
                  key={project.id}
                  onClick={() => router.push(`/${project.id}`)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`group relative bg-[var(--surface)] p-5 transition-colors flex flex-col justify-between gap-4 cursor-pointer select-none ${
                    isHighlighted
                      ? 'outline outline-1 outline-[var(--accent)]'
                      : 'hover:bg-[var(--surface-muted)]'
                  }`}
                >
                  {/* Card Top */}
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-8 h-8 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] flex items-center justify-center text-[var(--text)] shrink-0 group-hover:scale-105 group-hover:text-[var(--accent)] transition-all">
                        <Icons.Document size={15} />
                      </div>

                      <Badge
                        variant={
                          project.role === 'OWNER'
                            ? 'neutral'
                            : project.role === 'EDITOR'
                            ? 'blue'
                            : 'warning'
                        }
                        size="sm"
                      >
                        {project.role}
                      </Badge>
                    </div>

                    <h3 className="font-bold text-sm sm:text-base text-[var(--text)] tracking-tight group-hover:text-[var(--accent)] line-clamp-1 transition-colors">
                      {project.name}
                    </h3>

                    <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed font-normal">
                      {cleanPreview(project.content)}
                    </p>
                  </div>

                  {/* Card Bottom Meta & Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-[var(--border)] text-xs text-[var(--text-muted)]">
                    <div className="flex items-center gap-2 text-[11px] text-[var(--text-subtle)] min-w-0">
                      <Avatar
                        name={project.owner_name || user.name}
                        size="xs"
                        className="shrink-0"
                      />
                      <span className="truncate">
                        {project.role === 'OWNER' ? 'You' : project.owner_name || 'Collaborator'}
                      </span>
                      <span>•</span>
                      <span className="shrink-0">{formatRelativeTime(project.updated_at)}</span>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                      <IconButton
                        aria-label="Share document"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleOpenShare(project, e)}
                        className="text-[var(--text-subtle)] hover:text-[var(--text)]"
                      >
                        <Icons.Share size={13} />
                      </IconButton>

                      <IconButton
                        aria-label="Rename document"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setRenameProject(project);
                          setRenameInput(project.name);
                        }}
                        className="text-[var(--text-subtle)] hover:text-[var(--text)]"
                      >
                        <Icons.Edit size={13} />
                      </IconButton>

                      <IconButton
                        aria-label="Duplicate document"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDuplicate(project.id)}
                        className="text-[var(--text-subtle)] hover:text-[var(--text)]"
                      >
                        <Icons.Copy size={13} />
                      </IconButton>

                      {project.role === 'OWNER' && (
                        <IconButton
                          aria-label="Delete document"
                          variant="danger"
                          size="sm"
                          onClick={() => setDeleteProjectId(project.id)}
                          className="text-[var(--text-subtle)] hover:text-rose-400"
                        >
                          <Icons.Trash size={13} />
                        </IconButton>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List View */
          <div className="w-full border-y border-[var(--line)] bg-[var(--surface)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--line)] bg-[var(--paper)] font-mono text-[9px] uppercase tracking-wider text-[var(--muted)]">
                    <th className="py-3 px-4">Document</th>
                    <th className="py-3 px-4 hidden sm:table-cell">Owner</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4 hidden md:table-cell">Updated</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {sortedProjects.map((project, idx) => {
                    const isHighlighted = idx === highlightedIndex;
                    return (
                      <tr
                        key={project.id}
                        onClick={() => router.push(`/${project.id}`)}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={`hover:bg-[var(--surface-hover)] cursor-pointer transition-colors group ${
                          isHighlighted ? 'bg-[var(--surface-muted)]' : ''
                        }`}
                      >
                        {/* Name & Preview */}
                        <td className="py-3.5 px-4 min-w-[200px]">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] flex items-center justify-center text-[var(--text)] shrink-0 group-hover:scale-105 group-hover:text-[var(--accent)] transition-all">
                              <Icons.Document size={14} />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-xs sm:text-sm text-[var(--text)] group-hover:text-[var(--accent)] truncate transition-colors">
                                {project.name}
                              </span>
                              <span className="text-[11px] text-[var(--text-subtle)] truncate max-w-xs font-normal">
                                {cleanPreview(project.content)}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Owner */}
                        <td className="py-3.5 px-4 hidden sm:table-cell text-[var(--text-muted)]">
                          <div className="flex items-center gap-2">
                            <Avatar
                              name={project.owner_name || user.name}
                              size="xs"
                              className="shrink-0"
                            />
                            <span className="truncate">
                              {project.role === 'OWNER' ? 'You' : project.owner_name || 'Collaborator'}
                            </span>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-3.5 px-4">
                          <Badge
                            variant={
                              project.role === 'OWNER'
                                ? 'neutral'
                                : project.role === 'EDITOR'
                                ? 'blue'
                                : 'warning'
                            }
                            size="sm"
                          >
                            {project.role}
                          </Badge>
                        </td>

                        {/* Updated */}
                        <td className="py-3.5 px-4 hidden md:table-cell text-[var(--text-subtle)] text-[11px]">
                          {formatRelativeTime(project.updated_at)}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div
                            className="inline-flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <IconButton
                              aria-label="Share document"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleOpenShare(project, e)}
                              className="text-[var(--text-subtle)] hover:text-[var(--text)]"
                            >
                              <Icons.Share size={13} />
                            </IconButton>

                            <IconButton
                              aria-label="Rename document"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setRenameProject(project);
                                setRenameInput(project.name);
                              }}
                              className="text-[var(--text-subtle)] hover:text-[var(--text)]"
                            >
                              <Icons.Edit size={13} />
                            </IconButton>

                            <IconButton
                              aria-label="Duplicate document"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDuplicate(project.id)}
                              className="text-[var(--text-subtle)] hover:text-[var(--text)]"
                            >
                              <Icons.Copy size={13} />
                            </IconButton>

                            {project.role === 'OWNER' && (
                              <IconButton
                                aria-label="Delete document"
                                variant="danger"
                                size="sm"
                                onClick={() => setDeleteProjectId(project.id)}
                                className="text-[var(--text-subtle)] hover:text-rose-400"
                              >
                                <Icons.Trash size={13} />
                              </IconButton>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Share Document QR & Link Modal */}
      <ShareModal
        isOpen={Boolean(shareProject)}
        onClose={() => setShareProject(null)}
        documentId={shareProject?.id || ''}
        documentTitle={shareProject?.name || ''}
      />

      {/* Standardized Rename Modal */}
      <Modal
        isOpen={Boolean(renameProject)}
        onClose={() => setRenameProject(null)}
        title="Rename document"
        description="Choose a new title for this collaborative document."
        maxWidth="sm"
      >
        <form onSubmit={handleRenameSubmit} className="flex flex-col gap-4">
          <Input
            value={renameInput}
            onChange={(e) => setRenameInput(e.target.value)}
            autoFocus
            required
            label="Document Title"
          />

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setRenameProject(null)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Standardized Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteProjectId)}
        onClose={() => setDeleteProjectId(null)}
        title="Delete document?"
        description="Are you sure you want to delete this document? This action permanently removes all persisted collaborative edits."
        maxWidth="sm"
      >
        <div className="flex items-center justify-end gap-2 pt-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setDeleteProjectId(null)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={handleDeleteConfirm}
            isLoading={isDeleting}
          >
            Delete Document
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
}
