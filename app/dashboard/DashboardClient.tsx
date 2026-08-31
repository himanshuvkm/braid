'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { User, ProjectWithRole } from '../../lib/db';

interface DashboardClientProps {
  user: User;
  initialProjects: ProjectWithRole[];
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function DashboardClient({ user, initialProjects }: DashboardClientProps) {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectWithRole[]>(initialProjects);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Modals state
  const [renameProject, setRenameProject] = useState<ProjectWithRole | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

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
    setActionError(null);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Untitled Document' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create document');

      router.push(`/project/${data.project.id}`);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Create failed');
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
        prev.map((p) => (p.id === renameProject.id ? { ...p, name: renameInput.trim(), updated_at: Date.now() } : p))
      );
      setRenameProject(null);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Rename failed');
    }
  };

  const handleDuplicate = async (projectId: string) => {
    setActionError(null);
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
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Duplicate failed');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteProjectId) return;
    setIsDeleting(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/projects/${deleteProjectId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');

      setProjects((prev) => prev.filter((p) => p.id !== deleteProjectId));
      setDeleteProjectId(null);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#000000] flex flex-col selection:bg-[#6366f1]/20">
      {/* Top Header */}
      <header className="bg-[#ffffff] border-b border-[#e4e4e7] sticky top-0 z-20 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo & Workspace Title */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <span className="w-8 h-8 rounded-xl bg-[#000000] text-[#ffffff] flex items-center justify-center font-bold text-sm">
                B
              </span>
              <span className="font-black text-lg tracking-tight text-[#000000]">Braid</span>
            </Link>
            <span className="text-xs text-[#666666]">/</span>
            <span className="text-xs font-bold text-[#666666] tracking-wide uppercase">Workspace</span>
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCreateProject}
              disabled={isCreating}
              className="px-4 py-2 rounded-full bg-[#000000] text-[#ffffff] text-xs font-bold hover:opacity-90 active:scale-[0.98] transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <span>+</span>
              <span>{isCreating ? 'Creating...' : 'New Document'}</span>
            </button>

            <div className="h-4 w-[1px] bg-[#e4e4e7]" />

            <div className="flex items-center gap-2 pl-1">
              <div className="w-8 h-8 rounded-full bg-[#ececf0] border border-[#e4e4e7] flex items-center justify-center text-sm font-bold">
                {user.avatar || '👤'}
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-xs font-bold leading-tight">{user.name}</span>
                <span className="text-[10px] text-[#666666] leading-tight">{user.email}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="text-xs font-semibold text-[#666666] hover:text-[#000000] px-2.5 py-1 rounded-lg hover:bg-[#ececf0] transition-colors"
              title="Sign Out"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Canvas */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-6 flex-1">
        {/* Banner / Title & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#000000]">
              Documents & Projects
            </h1>
            <p className="text-xs text-[#666666] mt-1">
              {projects.length} {projects.length === 1 ? 'document' : 'documents'} in your collaborative workspace
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-72">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-[#666666]">🔍</span>
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#ffffff] border border-[#e4e4e7] text-xs text-[#000000] placeholder-[#666666]/50 outline-none focus:border-[#000000] transition-colors shadow-xs"
            />
          </div>
        </div>

        {/* Global Error Banner */}
        {actionError && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs font-medium text-red-700 flex items-center justify-between">
            <span>{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="text-xs font-bold text-red-700 hover:opacity-75"
            >
              ✕
            </button>
          </div>
        )}

        {/* Documents Grid */}
        {filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-[#ffffff] border border-[#e4e4e7] rounded-3xl text-center shadow-xs">
            <span className="text-4xl mb-3">📄</span>
            <h3 className="text-base font-bold text-[#000000]">
              {searchQuery ? 'No documents found' : 'No documents yet'}
            </h3>
            <p className="text-xs text-[#666666] max-w-sm mt-1 mb-6">
              {searchQuery
                ? `No documents matched "${searchQuery}". Try searching with a different term.`
                : 'Create your first collaborative document with Notion-style blocks and real-time CRDT sync.'}
            </p>
            {!searchQuery && (
              <button
                type="button"
                onClick={handleCreateProject}
                disabled={isCreating}
                className="px-5 py-2.5 rounded-full bg-[#000000] text-[#ffffff] text-xs font-bold hover:opacity-90 active:scale-[0.98] transition-all shadow-xs"
              >
                + Create First Document
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="group relative bg-[#ffffff] border border-[#e4e4e7] hover:border-[#000000] rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4 cursor-pointer"
                onClick={() => router.push(`/project/${project.id}`)}
              >
                {/* Card Top */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-9 h-9 rounded-xl bg-[#faf8f5] border border-[#e4e4e7] flex items-center justify-center text-base shrink-0 group-hover:scale-105 transition-transform">
                      📑
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          project.role === 'OWNER'
                            ? 'bg-neutral-100 text-neutral-800'
                            : project.role === 'EDITOR'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {project.role}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-bold text-base text-[#000000] tracking-tight group-hover:text-black line-clamp-1 mt-1">
                    {project.name}
                  </h3>

                  <p className="text-xs text-[#666666] line-clamp-2 leading-relaxed">
                    {project.content.replace(/^#+\s*/gm, '').slice(0, 100) || 'Empty document...'}
                  </p>
                </div>

                {/* Card Bottom / Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-[#e4e4e7] text-xs text-[#666666]">
                  <span className="text-[11px]">Edited {formatTime(project.updated_at)}</span>

                  {/* Actions Dropdown / Buttons */}
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => {
                        setRenameProject(project);
                        setRenameInput(project.name);
                      }}
                      className="p-1.5 hover:bg-[#ececf0] rounded-lg text-xs transition-colors"
                      title="Rename"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(project.id)}
                      className="p-1.5 hover:bg-[#ececf0] rounded-lg text-xs transition-colors"
                      title="Duplicate"
                    >
                      📑
                    </button>
                    {project.role === 'OWNER' && (
                      <button
                        type="button"
                        onClick={() => setDeleteProjectId(project.id)}
                        className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg text-xs transition-colors"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Rename Modal */}
      {renameProject && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-sm bg-[#ffffff] border border-[#e4e4e7] rounded-3xl p-6 shadow-xl flex flex-col gap-4">
            <h3 className="text-base font-bold text-[#000000]">Rename Document</h3>
            <form onSubmit={handleRenameSubmit} className="flex flex-col gap-4">
              <input
                type="text"
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf8f5] border border-[#e4e4e7] text-sm text-[#000000] outline-none focus:border-[#000000]"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenameProject(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#666666] hover:bg-[#ececf0]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#000000] text-[#ffffff] text-xs font-bold hover:opacity-90"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteProjectId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-sm bg-[#ffffff] border border-[#e4e4e7] rounded-3xl p-6 shadow-xl flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold text-[#000000]">Delete Document?</h3>
              <p className="text-xs text-[#666666]">
                Are you sure you want to delete this document? This action cannot be undone and will remove all persisted collaborative content.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteProjectId(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#666666] hover:bg-[#ececf0]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-red-600 text-[#ffffff] text-xs font-bold hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Document'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
