'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icons } from '../ui/icons';
import { Avatar } from '../ui/avatar';
import type { User, ProjectWithRole } from '../../lib/db';

interface PreviousDocumentsSidebarProps {
  initialUser?: User | null;
  className?: string;
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

export function PreviousDocumentsSidebar({ initialUser, className = '' }: PreviousDocumentsSidebarProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);
  const [user, setUser] = useState<User | null>(initialUser || null);
  const [projects, setProjects] = useState<ProjectWithRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAuthAndProjects = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch current user
      const authRes = await fetch('/api/auth/me');
      if (authRes.ok) {
        const authData = await authRes.json();
        if (authData?.user) {
          setUser(authData.user);
          // 2. Fetch user's previous projects
          const projRes = await fetch('/api/projects');
          if (projRes.ok) {
            const projData = await projRes.json();
            setProjects(projData.projects || []);
          }
        } else {
          setUser(null);
          setProjects([]);
        }
      } else {
        setUser(null);
        setProjects([]);
      }
    } catch {
      setUser(null);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuthAndProjects();
  }, [fetchAuthAndProjects]);

  return (
    <div className={`fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2 ${className}`}>
      {/* Expanded Sidebar Drawer */}
      {isOpen ? (
        <div className="w-80 sm:w-88 max-h-[440px] bg-neutral-900/95 backdrop-blur-md border border-neutral-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-down selection:bg-neutral-800 selection:text-neutral-200">
          {/* Header */}
          <div className="px-4 py-3 border-b border-neutral-800/80 flex items-center justify-between bg-neutral-950/40">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-neutral-800 text-neutral-300 flex items-center justify-center">
                <Icons.Document size={12} />
              </div>
              <span className="text-xs font-semibold text-neutral-200">Previous Documents</span>
              {user && projects.length > 0 && (
                <span className="text-[10px] font-mono text-neutral-400 bg-neutral-800 px-1.5 py-0.2 rounded">
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
                  className="p-1 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60 transition-colors cursor-pointer"
                >
                  <Icons.Refresh size={12} className={loading ? 'animate-spin' : ''} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Minimize"
                className="p-1 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60 transition-colors cursor-pointer"
              >
                <Icons.ChevronDown size={14} />
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1 min-h-[160px] max-h-[300px]">
            {loading && user ? (
              <div className="flex flex-col gap-2 p-3 animate-pulse">
                <div className="h-4 bg-neutral-800/60 rounded w-3/4" />
                <div className="h-4 bg-neutral-800/60 rounded w-1/2" />
                <div className="h-4 bg-neutral-800/60 rounded w-2/3" />
              </div>
            ) : user ? (
              /* Logged-in View */
              projects.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {projects.slice(0, 10).map((proj) => (
                    <Link
                      key={proj.id}
                      href={`/${encodeURIComponent(proj.id)}`}
                      className="group flex items-center justify-between gap-2.5 p-2.5 rounded-xl hover:bg-neutral-800/70 border border-transparent hover:border-neutral-700/60 transition-all text-left"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-400 group-hover:text-neutral-200 group-hover:border-neutral-700 flex items-center justify-center shrink-0 transition-colors">
                          <Icons.Document size={12} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-medium text-neutral-200 group-hover:text-white truncate">
                            {proj.name || 'Untitled Document'}
                          </span>
                          <span className="text-[10px] text-neutral-500 font-mono">
                            {proj.updated_at ? formatRelativeTime(proj.updated_at) : 'Recent'}
                          </span>
                        </div>
                      </div>

                      <Icons.ArrowRight
                        size={12}
                        className="text-neutral-600 group-hover:text-neutral-300 group-hover:translate-x-0.5 transition-all shrink-0"
                      />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 px-4 text-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-neutral-800/50 flex items-center justify-center text-neutral-500">
                    <Icons.Document size={14} />
                  </div>
                  <span className="text-xs font-medium text-neutral-300">No documents yet</span>
                  <p className="text-[11px] text-neutral-500">
                    Start typing above to create your first collaborative room.
                  </p>
                </div>
              )
            ) : (
              /* Not Logged-in View */
              <div className="flex flex-col items-center justify-center py-6 px-4 text-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-neutral-800/60 border border-neutral-700/60 flex items-center justify-center text-neutral-400">
                  <Icons.Lock size={16} />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-semibold text-neutral-200">
                    Please login to see previous documents
                  </p>
                  <p className="text-[11px] text-neutral-400 leading-relaxed max-w-[240px]">
                    Sign in to your account to view, search, and continue writing your saved documents.
                  </p>
                </div>
                <Link
                  href="/login?from=/"
                  className="mt-1 px-4 py-1.5 rounded-lg bg-neutral-200 hover:bg-white text-neutral-950 text-xs font-semibold transition-all active:scale-[0.98] flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Icons.User size={12} />
                  <span>Log In</span>
                </Link>
              </div>
            )}
          </div>

          {/* Footer for Logged In User */}
          {user && (
            <div className="p-2 border-t border-neutral-800/80 bg-neutral-950/30 flex items-center justify-between text-xs">
              <Link
                href="/dashboard"
                className="text-[11px] text-neutral-400 hover:text-neutral-200 transition-colors flex items-center gap-1"
              >
                <span>View all in Dashboard</span>
                <Icons.ArrowRight size={10} />
              </Link>
              <button
                type="button"
                onClick={() => {
                  const newId = `doc-${Math.random().toString(36).substring(2, 8)}`;
                  router.push(`/${newId}`);
                }}
                className="text-[11px] font-medium text-neutral-300 hover:text-white px-2 py-1 rounded-md bg-neutral-800 hover:bg-neutral-700 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Icons.Plus size={11} />
                <span>New</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Minimized Floating Button */
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-900/95 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-200 text-xs font-medium shadow-2xl transition-all cursor-pointer group active:scale-[0.98]"
        >
          <Icons.Document size={14} className="text-neutral-400 group-hover:text-neutral-200 transition-colors" />
          <span>Previous Documents</span>
          {user && projects.length > 0 && (
            <span className="text-[10px] font-mono text-neutral-400 bg-neutral-800 px-1.5 py-0.2 rounded">
              {projects.length}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
