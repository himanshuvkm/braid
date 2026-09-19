'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { User, ProjectWithRole } from '../../lib/db';
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
  const [currentTime] = useState(() => Date.now());
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

  // Modals state
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

  const handleCreateProject = async () => {
    setIsCreating(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Untitled Document' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create document');

      toast('Document created');
      router.push(`/${data.project.id}`);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Create failed', 'error');
      setIsCreating(false);
    }
  };

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

  // Filter and search logic
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchesSearch =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.content.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (activeFilter === 'owned') return p.role === 'OWNER';
      if (activeFilter === 'shared') return p.role !== 'OWNER';
      if (activeFilter === 'recent') {
        const sevenDaysAgo = currentTime - 7 * 24 * 60 * 60 * 1000;
        return p.updated_at >= sevenDaysAgo;
      }
      return true;
    });
  }, [projects, searchQuery, activeFilter, currentTime]);

  // Sort logic
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

  const sevenDaysAgo = currentTime - 7 * 24 * 60 * 60 * 1000;
  const counts = {
    all: projects.length,
    owned: projects.filter((p) => p.role === 'OWNER').length,
    shared: projects.filter((p) => p.role !== 'OWNER').length,
    recent: projects.filter((p) => p.updated_at >= sevenDaysAgo).length,
  };

  const pageTitle =
    activeFilter === 'all'
      ? 'All Documents'
      : activeFilter === 'owned'
      ? 'My Documents'
      : activeFilter === 'shared'
      ? 'Shared with me'
      : 'Recent Documents';

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
      onCreateDocument={handleCreateProject}
      isCreating={isCreating}
      onSignOut={handleSignOut}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      pageTitle={pageTitle}
    >
      <main className="p-4 sm:p-8 lg:p-10 max-w-6xl w-full mx-auto flex flex-col gap-6 sm:gap-7 flex-1">
        {/* Greeting Banner */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-100">
              Welcome back, {user.name}
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              {projects.length} {projects.length === 1 ? 'document' : 'documents'} in your collaborative workspace
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={handleCreateProject}
            isLoading={isCreating}
            leftIcon={<Icons.Plus size={14} />}
            className="self-start sm:self-auto"
          >
            New document
          </Button>
        </div>

        {/* Workspace Toolbar: Search / Filter summary, Sort dropdown, and Grid/List toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 pb-1 border-b border-neutral-800">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-200">
            <span>{pageTitle}</span>
            <span className="text-[11px] text-neutral-500 font-normal">
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
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 border border-neutral-800 transition-all cursor-pointer"
                >
                  <Icons.ArrowUpDown size={12} className="text-neutral-500" />
                  <span>{sortLabels[sortBy]}</span>
                  <Icons.ChevronDown size={11} className="text-neutral-500" />
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
            <div className="flex items-center rounded-lg bg-neutral-950 p-0.5 border border-neutral-800">
              <button
                type="button"
                aria-label="Grid view"
                onClick={() => handleSetViewMode('grid')}
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-neutral-800 text-neutral-100 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-300'
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
                    ? 'bg-neutral-800 text-neutral-100 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <Icons.List size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Content Area: Grid View, List View, or Context-Sensitive Empty State */}
        {sortedProjects.length === 0 ? (
          searchQuery ? (
            /* Empty State: Search */
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
            /* Empty State: Filter */
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
            /* Empty State: Global */
            <EmptyState
              icon={<Icons.Document size={20} />}
              title="No documents yet"
              description="Start writing in real time with Notion-style blocks and conflict-free collaboration."
              action={
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleCreateProject}
                  isLoading={isCreating}
                  leftIcon={<Icons.Plus size={14} />}
                >
                  Create your first document
                </Button>
              }
            />
          )
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {sortedProjects.map((project) => (
              <div
                key={project.id}
                onClick={() => router.push(`/${project.id}`)}
                className="group relative bg-neutral-900/90 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-5 shadow-card hover:shadow-xl transition-all flex flex-col justify-between gap-4 cursor-pointer focus-within:ring-2 focus-within:ring-neutral-700"
              >
                {/* Card Content Top */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-8 h-8 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center text-neutral-300 shrink-0 group-hover:scale-105 transition-transform">
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

                  <h3 className="font-bold text-sm sm:text-base text-neutral-200 tracking-tight group-hover:text-white line-clamp-1">
                    {project.name}
                  </h3>

                  <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed font-normal">
                    {cleanPreview(project.content)}
                  </p>
                </div>

                {/* Card Bottom Meta & Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-neutral-800/80 text-xs text-neutral-400">
                  <div className="flex items-center gap-2 text-[11px] text-neutral-500 min-w-0">
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

                  {/* Action Buttons */}
                  <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                    <IconButton
                      aria-label="Rename document"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRenameProject(project);
                        setRenameInput(project.name);
                      }}
                      className="text-neutral-400 hover:text-neutral-200"
                    >
                      <Icons.Edit size={13} />
                    </IconButton>

                    <IconButton
                      aria-label="Duplicate document"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDuplicate(project.id)}
                      className="text-neutral-400 hover:text-neutral-200"
                    >
                      <Icons.Copy size={13} />
                    </IconButton>

                    {project.role === 'OWNER' && (
                      <IconButton
                        aria-label="Delete document"
                        variant="danger"
                        size="sm"
                        onClick={() => setDeleteProjectId(project.id)}
                        className="text-neutral-400 hover:text-rose-400"
                      >
                        <Icons.Trash size={13} />
                      </IconButton>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View (Table / Rows) */
          <div className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-neutral-800 bg-neutral-950/60 text-neutral-400 font-semibold">
                    <th className="py-3 px-4">Document</th>
                    <th className="py-3 px-4 hidden sm:table-cell">Owner</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4 hidden md:table-cell">Updated</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {sortedProjects.map((project) => (
                    <tr
                      key={project.id}
                      onClick={() => router.push(`/${project.id}`)}
                      className="hover:bg-neutral-800/50 cursor-pointer transition-colors group"
                    >
                      {/* Name & Preview */}
                      <td className="py-3.5 px-4 min-w-[200px]">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-center text-neutral-300 shrink-0 group-hover:scale-105 transition-transform">
                            <Icons.Document size={14} />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-xs sm:text-sm text-neutral-200 group-hover:text-white truncate">
                              {project.name}
                            </span>
                            <span className="text-[11px] text-neutral-500 truncate max-w-xs font-normal">
                              {cleanPreview(project.content)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Owner */}
                      <td className="py-3.5 px-4 hidden sm:table-cell text-neutral-400">
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
                      <td className="py-3.5 px-4 hidden md:table-cell text-neutral-500 text-[11px]">
                        {formatRelativeTime(project.updated_at)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div
                          className="inline-flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <IconButton
                            aria-label="Rename document"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setRenameProject(project);
                              setRenameInput(project.name);
                            }}
                            className="text-neutral-400 hover:text-neutral-200"
                          >
                            <Icons.Edit size={13} />
                          </IconButton>

                          <IconButton
                            aria-label="Duplicate document"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDuplicate(project.id)}
                            className="text-neutral-400 hover:text-neutral-200"
                          >
                            <Icons.Copy size={13} />
                          </IconButton>

                          {project.role === 'OWNER' && (
                            <IconButton
                              aria-label="Delete document"
                              variant="danger"
                              size="sm"
                              onClick={() => setDeleteProjectId(project.id)}
                              className="text-neutral-400 hover:text-rose-400"
                            >
                              <Icons.Trash size={13} />
                            </IconButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

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
