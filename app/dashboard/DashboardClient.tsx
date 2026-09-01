'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { User, ProjectWithRole } from '../../lib/db';
import { Icons } from '../../components/ui/icons';
import { useToast } from '../../components/ui/toast';

interface DashboardClientProps {
  user: User;
  initialProjects: ProjectWithRole[];
}

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

export function DashboardClient({ user, initialProjects }: DashboardClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [projects, setProjects] = useState<ProjectWithRole[]>(initialProjects);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'owned' | 'shared'>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Modals state
  const [renameProject, setRenameProject] = useState<ProjectWithRole | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
      router.push(`/project/${data.project.id}`);
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
        prev.map((p) => (p.id === renameProject.id ? { ...p, name: renameInput.trim(), updated_at: Date.now() } : p))
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
  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.content.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (activeFilter === 'owned') return p.role === 'OWNER';
    if (activeFilter === 'shared') return p.role !== 'OWNER';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#191919] flex selection:bg-[#191919]/10">
      {/* Workspace Sidebar (Desktop & Mobile Drawer) */}
      <aside
        className={`fixed md:sticky top-0 z-40 h-screen w-64 bg-[#f4f3ef] border-r border-[#e8e6e1] flex flex-col justify-between p-4 transition-transform duration-200 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col gap-5">
          {/* Workspace Title & Brand */}
          <div className="flex items-center justify-between px-2 pt-2">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-6 h-6 rounded-lg bg-[#191919] text-[#ffffff] flex items-center justify-center shadow-xs">
                <Icons.Logo size={14} />
              </div>
              <span className="font-bold text-sm tracking-tight text-[#191919]">Braid Workspace</span>
            </Link>

            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="md:hidden p-1 text-[#64635e] hover:text-[#191919]"
            >
              <Icons.X size={16} />
            </button>
          </div>

          {/* Quick Create Action */}
          <button
            type="button"
            onClick={handleCreateProject}
            disabled={isCreating}
            className="w-full py-2 px-3 rounded-xl bg-[#ffffff] border border-[#e8e6e1] hover:border-[#191919] text-[#191919] text-xs font-semibold shadow-xs hover:shadow-sm transition-all flex items-center justify-between disabled:opacity-50"
          >
            <div className="flex items-center gap-2">
              <Icons.Plus size={14} className="text-[#191919]" />
              <span>{isCreating ? 'Creating...' : 'New document'}</span>
            </div>
            <span className="text-[10px] text-[#9a9994] font-mono">⌘N</span>
          </button>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left font-medium transition-colors ${
                activeFilter === 'all'
                  ? 'bg-[#ffffff] text-[#191919] shadow-xs font-semibold'
                  : 'text-[#64635e] hover:bg-[#eeede8] hover:text-[#191919]'
              }`}
            >
              <Icons.Home size={14} />
              <span>All Documents</span>
              <span className="ml-auto text-[10px] text-[#9a9994]">{projects.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('owned')}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left font-medium transition-colors ${
                activeFilter === 'owned'
                  ? 'bg-[#ffffff] text-[#191919] shadow-xs font-semibold'
                  : 'text-[#64635e] hover:bg-[#eeede8] hover:text-[#191919]'
              }`}
            >
              <Icons.Document size={14} />
              <span>My Documents</span>
              <span className="ml-auto text-[10px] text-[#9a9994]">
                {projects.filter((p) => p.role === 'OWNER').length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('shared')}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left font-medium transition-colors ${
                activeFilter === 'shared'
                  ? 'bg-[#ffffff] text-[#191919] shadow-xs font-semibold'
                  : 'text-[#64635e] hover:bg-[#eeede8] hover:text-[#191919]'
              }`}
            >
              <Icons.Users size={14} />
              <span>Shared with me</span>
              <span className="ml-auto text-[10px] text-[#9a9994]">
                {projects.filter((p) => p.role !== 'OWNER').length}
              </span>
            </button>
          </nav>
        </div>

        {/* User Account Bar */}
        <div className="pt-3 border-t border-[#e8e6e1] flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-[#191919] text-[#ffffff] flex items-center justify-center text-xs font-bold shrink-0">
              {user.avatar || user.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-[#191919] truncate">{user.name}</span>
              <span className="text-[10px] text-[#9a9994] truncate">{user.email}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="p-1.5 text-[#64635e] hover:text-[#191919] hover:bg-[#eeede8] rounded-lg transition-colors"
            title="Sign Out"
          >
            <Icons.ArrowRight size={14} />
          </button>
        </div>
      </aside>

      {/* Backdrop for Mobile Drawer */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 border-b border-[#e8e6e1] bg-[#faf9f6]/90 backdrop-blur-md px-6 flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-1.5 text-[#64635e] hover:text-[#191919] rounded-lg hover:bg-[#f4f3ef]"
            >
              <Icons.Menu size={18} />
            </button>

            <span className="text-sm font-semibold text-[#191919]">
              {activeFilter === 'all'
                ? 'All Documents'
                : activeFilter === 'owned'
                ? 'My Documents'
                : 'Shared with me'}
            </span>
          </div>

          {/* Search Box */}
          <div className="relative w-full max-w-xs">
            <Icons.Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9a9994]" />
            <input
              type="text"
              placeholder="Search in workspace..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 rounded-xl bg-[#f4f3ef] border border-transparent focus:border-[#191919] focus:bg-[#ffffff] text-xs text-[#191919] placeholder-[#9a9994] outline-none transition-all"
            />
          </div>
        </header>

        {/* Dashboard Main Workspace */}
        <main className="p-6 sm:p-10 max-w-6xl w-full mx-auto flex flex-col gap-8 flex-1">
          {/* Greeting Banner */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#191919]">
                Welcome back, {user.name}
              </h1>
              <p className="text-xs text-[#64635e] mt-1">
                {projects.length} {projects.length === 1 ? 'document' : 'documents'} in your collaborative workspace
              </p>
            </div>

            <button
              type="button"
              onClick={handleCreateProject}
              disabled={isCreating}
              className="px-4 py-2 rounded-xl bg-[#191919] text-[#ffffff] text-xs font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-xs flex items-center gap-1.5 self-start sm:self-auto disabled:opacity-50"
            >
              <Icons.Plus size={14} />
              <span>New document</span>
            </button>
          </div>

          {/* Documents Grid or Empty State */}
          {filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 bg-[#ffffff] border border-[#e8e6e1] rounded-3xl text-center shadow-card animate-fade-in">
              <div className="w-12 h-12 rounded-2xl bg-[#f4f3ef] flex items-center justify-center text-[#64635e] mb-4">
                <Icons.Document size={22} />
              </div>
              <h3 className="text-base font-bold text-[#191919]">
                {searchQuery ? 'No documents matched your search' : 'No documents yet'}
              </h3>
              <p className="text-xs text-[#64635e] max-w-sm mt-1.5 mb-6 leading-relaxed">
                {searchQuery
                  ? `No documents found matching "${searchQuery}". Try a different keyword.`
                  : 'Start writing in real time with Notion-style blocks and conflict-free collaboration.'}
              </p>
              {!searchQuery && (
                <button
                  type="button"
                  onClick={handleCreateProject}
                  disabled={isCreating}
                  className="px-5 py-2.5 rounded-xl bg-[#191919] text-[#ffffff] text-xs font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-xs flex items-center gap-2"
                >
                  <Icons.Plus size={14} />
                  <span>Create first document</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => router.push(`/project/${project.id}`)}
                  className="group relative bg-[#ffffff] border border-[#e8e6e1] hover:border-[#191919] rounded-2xl p-5 shadow-card hover:shadow-lg transition-all flex flex-col justify-between gap-4 cursor-pointer"
                >
                  {/* Card Content Top */}
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-8 h-8 rounded-xl bg-[#f4f3ef] flex items-center justify-center text-[#191919] shrink-0 group-hover:scale-105 transition-transform">
                        <Icons.Document size={16} />
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          project.role === 'OWNER'
                            ? 'bg-[#f4f3ef] text-[#191919]'
                            : project.role === 'EDITOR'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {project.role}
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-[#191919] tracking-tight group-hover:text-black line-clamp-1">
                      {project.name}
                    </h3>

                    <p className="text-xs text-[#64635e] line-clamp-2 leading-relaxed font-normal">
                      {project.content.replace(/^#+\s*/gm, '').slice(0, 120) || 'Empty document...'}
                    </p>
                  </div>

                  {/* Card Actions Bottom */}
                  <div className="flex items-center justify-between pt-3 border-t border-[#e8e6e1] text-xs text-[#64635e]">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <Icons.Clock size={12} className="text-[#9a9994]" />
                      <span>{formatRelativeTime(project.updated_at)}</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => {
                          setRenameProject(project);
                          setRenameInput(project.name);
                        }}
                        className="p-1.5 hover:bg-[#f4f3ef] rounded-lg text-[#64635e] hover:text-[#191919] transition-colors"
                        title="Rename"
                      >
                        <Icons.Edit size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicate(project.id)}
                        className="p-1.5 hover:bg-[#f4f3ef] rounded-lg text-[#64635e] hover:text-[#191919] transition-colors"
                        title="Duplicate"
                      >
                        <Icons.Copy size={13} />
                      </button>
                      {project.role === 'OWNER' && (
                        <button
                          type="button"
                          onClick={() => setDeleteProjectId(project.id)}
                          className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg text-[#64635e] transition-colors"
                          title="Delete"
                        >
                          <Icons.Trash size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Rename Modal */}
      {renameProject && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-sm bg-[#ffffff] border border-[#e8e6e1] rounded-3xl p-6 shadow-modal flex flex-col gap-4">
            <h3 className="text-base font-bold text-[#191919]">Rename document</h3>
            <form onSubmit={handleRenameSubmit} className="flex flex-col gap-4">
              <input
                type="text"
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf9f6] border border-[#e8e6e1] text-sm text-[#191919] outline-none focus:border-[#191919]"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenameProject(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#64635e] hover:bg-[#f4f3ef]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#191919] text-[#ffffff] text-xs font-semibold hover:opacity-90"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteProjectId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-sm bg-[#ffffff] border border-[#e8e6e1] rounded-3xl p-6 shadow-modal flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold text-[#191919]">Delete document?</h3>
              <p className="text-xs text-[#64635e] leading-relaxed">
                Are you sure you want to delete this document? This action permanently removes all persisted collaborative edits.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteProjectId(null)}
                disabled={isDeleting}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#64635e] hover:bg-[#f4f3ef]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-red-600 text-[#ffffff] text-xs font-semibold hover:bg-red-700 disabled:opacity-50"
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
