'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icons } from '../ui/icons';
import { Tooltip } from '../ui/tooltip';
import type { User, ProjectWithRole } from '../../lib/db';

interface PreviousDocumentsSidebarProps {
  initialUser?: User | null;
  className?: string;
  defaultOpen?: boolean;
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

export function PreviousDocumentsSidebar({
  initialUser,
  className = '',
  defaultOpen = false,
}: PreviousDocumentsSidebarProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [user, setUser] = useState<User | null>(initialUser || null);
  const [projects, setProjects] = useState<ProjectWithRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const drawerRef = useRef<HTMLDivElement>(null);

  const fetchAuthAndProjects = useCallback(async () => {
    setLoading(true);
    try {
      const authRes = await fetch('/api/auth/me');
      if (!authRes.ok) {
        setUser(null);
        setProjects([]);
        return;
      }
      const authData = await authRes.json();
      if (authData?.user) {
        setUser(authData.user);
        const projRes = await fetch('/api/projects');
        if (projRes.ok) {
          const projData = await projRes.json();
          setProjects(projData.projects || []);
        }
      }
    } catch {
      setUser(null);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      fetchAuthAndProjects();
    }, 0);
    return () => clearTimeout(timer);
  }, [isOpen, fetchAuthAndProjects]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const filteredProjects = projects.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.content && p.content.toLowerCase().includes(q))
    );
  });

  return (
    <>
      {/* Fixed Toggle Button with proper margin bottom */}
      {!isOpen && (
        <div className={`fixed bottom-12 right-4 sm:bottom-14 sm:right-6 mb-2 z-30 ${className}`}>
          <Tooltip content="Open previous documents drawer" position="left">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              aria-label="Open previous documents sidebar"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] hover:border-[var(--border-strong)] text-[var(--text)] text-xs font-medium shadow-modal transition-all cursor-pointer group active:scale-95"
            >
              <Icons.Folder size={14} className="text-[var(--text-subtle)] group-hover:text-[var(--accent)] transition-colors" />
              <span>Previous Documents</span>
              {projects.length > 0 && (
                <span className="text-[10px] font-mono text-[var(--text-subtle)] bg-[var(--surface-muted)] border border-[var(--border)] px-1.5 py-0.5 rounded-full">
                  {projects.length}
                </span>
              )}
            </button>
          </Tooltip>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          role="presentation"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 transition-opacity duration-300 animate-fade-in"
        />
      )}

      {/* Slide-over Right Sidebar Drawer */}
      <aside
        ref={drawerRef}
        aria-label="Previous documents sidebar"
        className={`fixed top-0 right-0 h-screen w-[88vw] max-w-sm sm:w-96 bg-[var(--surface)] border-l border-[var(--border)] shadow-modal z-50 flex flex-col justify-between transition-transform duration-300 ease-out select-none ${
          isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        } ${className}`}
      >
        {/* Top Header */}
        <div className="flex flex-col border-b border-[var(--border)]">
          <div className="px-4 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--text)] flex items-center justify-center">
                <Icons.Folder size={13} className="text-[var(--accent)]" />
              </div>
              <span className="text-xs font-semibold text-[var(--text)]">Previous Documents</span>
              {projects.length > 0 && (
                <span className="text-[10px] font-mono text-[var(--text-subtle)] bg-[var(--surface-muted)] border border-[var(--border)] px-1.5 py-0.5 rounded-full">
                  {projects.length}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {user && (
                <button
                  type="button"
                  onClick={fetchAuthAndProjects}
                  title="Refresh documents"
                  className="p-1.5 rounded-lg text-[var(--text-subtle)] hover:text-[var(--text)] hover:bg-[var(--surface-muted)] transition-colors cursor-pointer"
                >
                  <Icons.Refresh size={13} className={loading ? 'animate-spin' : ''} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close sidebar"
                aria-label="Close sidebar"
                className="p-1.5 rounded-lg text-[var(--text-subtle)] hover:text-[var(--text)] hover:bg-[var(--surface-muted)] transition-colors cursor-pointer"
              >
                <Icons.X size={14} />
              </button>
            </div>
          </div>

          {/* Search Bar inside Drawer */}
          {user && projects.length > 0 && (
            <div className="px-4 pb-3">
              <div className="relative">
                <Icons.Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-subtle)] pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-7 pr-7 py-1.5 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] focus:border-[var(--border-strong)] text-xs text-[var(--text)] placeholder-[var(--text-subtle)] outline-none transition-all focus:ring-1 focus:ring-[var(--accent)]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-subtle)] hover:text-[var(--text)] p-0.5"
                  >
                    <Icons.X size={11} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Scrollable Document List */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5">
          {loading ? (
            <div className="flex flex-col gap-2 p-3 animate-pulse">
              <div className="h-10 bg-[var(--surface-muted)] rounded-xl w-full" />
              <div className="h-10 bg-[var(--surface-muted)] rounded-xl w-full" />
              <div className="h-10 bg-[var(--surface-muted)] rounded-xl w-full" />
            </div>
          ) : user ? (
            /* Logged-in View */
            filteredProjects.length > 0 ? (
              <div className="flex flex-col gap-1">
                {filteredProjects.map((proj) => (
                  <Link
                    key={proj.id}
                    href={`/${encodeURIComponent(proj.id)}`}
                    onClick={() => setIsOpen(false)}
                    className="group flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-muted)] border border-[var(--border)] hover:border-[var(--border-strong)] transition-all text-left shadow-2xs hover:shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--text-subtle)] group-hover:text-[var(--accent)] flex items-center justify-center shrink-0 transition-colors">
                        <Icons.Document size={13} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-[var(--text)] group-hover:text-[var(--accent)] truncate transition-colors">
                          {proj.name || 'Untitled Document'}
                        </span>
                        <span className="text-[10px] text-[var(--text-subtle)] font-mono">
                          {proj.updated_at ? formatRelativeTime(proj.updated_at) : 'Recent'}
                        </span>
                      </div>
                    </div>

                    <Icons.ArrowRight
                      size={12}
                      className="text-[var(--text-subtle)] group-hover:text-[var(--text)] group-hover:translate-x-0.5 transition-all shrink-0"
                    />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] flex items-center justify-center text-[var(--text-subtle)]">
                  <Icons.Document size={16} />
                </div>
                <span className="text-xs font-semibold text-[var(--text)]">
                  {searchQuery ? 'No matching documents' : 'No documents yet'}
                </span>
                <p className="text-[11px] text-[var(--text-subtle)] max-w-[200px]">
                  {searchQuery
                    ? `No documents found matching "${searchQuery}".`
                    : 'Create your first collaborative document to start writing.'}
                </p>
              </div>
            )
          ) : (
            /* Not Logged-in View */
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[var(--surface-muted)] border border-[var(--border)] flex items-center justify-center text-[var(--text-subtle)]">
                <Icons.Lock size={18} />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-xs font-semibold text-[var(--text)]">
                  Please login to see previous documents
                </p>
                <p className="text-[11px] text-[var(--text-subtle)] leading-relaxed max-w-[220px]">
                  Sign in to your account to view, search, and continue writing your saved documents.
                </p>
              </div>
              <Link
                href="/login?from=/"
                className="mt-1 px-4 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Icons.User size={12} />
                <span>Log In</span>
              </Link>
            </div>
          )}
        </div>

        {/* Footer for Drawer */}
        {user && (
          <div className="p-3 border-t border-[var(--border)] bg-[var(--surface-muted)] flex items-center justify-between text-xs">
            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className="text-[11px] text-[var(--text-subtle)] hover:text-[var(--text)] transition-colors flex items-center gap-1"
            >
              <span>View all in Dashboard</span>
              <Icons.ArrowRight size={10} />
            </Link>
            <button
              type="button"
              onClick={() => {
                const newId = `doc-${Math.random().toString(36).substring(2, 8)}`;
                router.push(`/${newId}`);
                setIsOpen(false);
              }}
              className="text-[11px] font-semibold text-white px-2.5 py-1 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-xs"
            >
              <Icons.Plus size={12} />
              <span>New</span>
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
