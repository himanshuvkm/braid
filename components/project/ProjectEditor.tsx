'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { Editor } from '../editor/Editor';
import type { User, Project, ProjectRole } from '../../lib/db';

interface ProjectEditorProps {
  project: Project;
  user: User;
  role: ProjectRole;
}

export type AutoSaveStatus = 'saved' | 'saving' | 'offline' | 'error';

export function ProjectEditor({ project, user, role }: ProjectEditorProps) {
  const [saveStatus, setSaveStatus] = useState<AutoSaveStatus>('saved');
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [shareRole, setShareRole] = useState<'EDITOR' | 'VIEWER'>('EDITOR');
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);
  const [members, setMembers] = useState<Array<{ user: User; role: ProjectRole }>>([]);
  const [isSharing, setIsSharing] = useState(false);

  const pendingSaveContentRef = useRef<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced Auto-save to Server API
  const triggerAutoSave = useCallback(
    (latestContent: string) => {
      if (role === 'VIEWER') return; // Viewers do not save

      pendingSaveContentRef.current = latestContent;
      setSaveStatus('saving');

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        const contentToSave = pendingSaveContentRef.current;
        if (contentToSave === null) return;

        try {
          const res = await fetch(`/api/projects/${project.id}/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: contentToSave }),
          });

          if (!res.ok) {
            throw new Error('Save request failed');
          }

          setSaveStatus('saved');
          pendingSaveContentRef.current = null;
        } catch {
          if (typeof navigator !== 'undefined' && !navigator.onLine) {
            setSaveStatus('offline');
          } else {
            setSaveStatus('error');
          }
        }
      }, 1000); // 1-second debounce
    },
    [project.id, role]
  );

  // Immediate flush on page refresh or unload to eliminate persistence window
  useEffect(() => {
    const handleUnload = () => {
      if (pendingSaveContentRef.current !== null && role !== 'VIEWER') {
        const payload = JSON.stringify({ content: pendingSaveContentRef.current });
        try {
          fetch(`/api/projects/${project.id}/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true,
          });
        } catch {}
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
    };
  }, [project.id, role]);

  // Load project members on opening share modal
  const fetchMembers = async () => {
    try {
      const res = await fetch(`/api/projects/${project.id}/members`);
      const data = await res.json();
      if (res.ok && data.members) {
        setMembers(data.members);
      }
    } catch {}
  };

  const handleShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareEmail.trim()) return;
    setIsSharing(true);
    setShareError(null);
    setShareSuccess(null);

    try {
      const res = await fetch(`/api/projects/${project.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: shareEmail.trim(), role: shareRole }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to share project');
      }

      setShareSuccess(`Invited ${shareEmail} as ${shareRole}`);
      setShareEmail('');
      fetchMembers();
    } catch (err: unknown) {
      setShareError(err instanceof Error ? err.message : 'Share failed');
    } finally {
      setIsSharing(false);
    }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    try {
      const res = await fetch(`/api/projects/${project.id}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUserId }),
      });

      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.user.id !== targetUserId));
      }
    } catch {}
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#faf8f5]">
      {/* Top Project Navigation & Workspace Bar */}
      <div className="bg-[#ffffff] border-b border-[#e4e4e7] px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 sticky top-0 z-20 shadow-xs">
        {/* Left: Back to Dashboard & Project Info */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#faf8f5] hover:bg-[#ececf0] text-xs font-bold text-[#000000] border border-[#e4e4e7] transition-colors shadow-xs"
          >
            <span>←</span>
            <span>Dashboard</span>
          </Link>

          <div className="h-4 w-[1px] bg-[#e4e4e7]" />

          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-[#000000] tracking-tight">{project.name}</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                role === 'OWNER'
                  ? 'bg-neutral-100 text-neutral-800'
                  : role === 'EDITOR'
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-amber-50 text-amber-700'
              }`}
            >
              {role}
            </span>
          </div>
        </div>

        {/* Right: Autosave Status, Share, & User Identity */}
        <div className="flex items-center gap-3">
          {/* Autosave Status Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#faf8f5] border border-[#e4e4e7] text-xs font-medium">
            <span
              className={`w-2 h-2 rounded-full ${
                saveStatus === 'saved'
                  ? 'bg-emerald-500'
                  : saveStatus === 'saving'
                  ? 'bg-amber-500 animate-pulse'
                  : saveStatus === 'offline'
                  ? 'bg-amber-600'
                  : 'bg-red-500'
              }`}
            />
            <span className="text-[#666666]">
              {saveStatus === 'saved'
                ? '✓ Saved to DB'
                : saveStatus === 'saving'
                ? 'Saving...'
                : saveStatus === 'offline'
                ? 'Offline'
                : 'Save failed'}
            </span>
          </div>

          {/* Share Modal Trigger (Available to Owners) */}
          {role === 'OWNER' && (
            <button
              type="button"
              onClick={() => {
                setShowShareModal(true);
                fetchMembers();
              }}
              className="px-3 py-1.5 rounded-full bg-[#000000] text-[#ffffff] text-xs font-bold hover:opacity-90 transition-opacity shadow-xs flex items-center gap-1.5"
            >
              <span>👥</span>
              <span>Share</span>
            </button>
          )}

          {/* User Profile */}
          <div className="flex items-center gap-1.5 pl-1">
            <div className="w-7 h-7 rounded-full bg-[#ececf0] border border-[#e4e4e7] flex items-center justify-center text-xs font-bold">
              {user.avatar || '👤'}
            </div>
            <span className="text-xs font-bold text-[#000000] hidden sm:inline">{user.name}</span>
          </div>
        </div>
      </div>

      {/* Main Collaborative Block Editor */}
      <div className="flex-1 p-2 sm:p-6 max-w-6xl mx-auto w-full">
        <Editor
          documentId={project.id}
          initialRoomName={project.name}
          userName={user.name}
          userId={user.id}
          isReadOnly={role === 'VIEWER'}
          initialContent={project.content}
          onContentChange={(newContent) => {
            triggerAutoSave(newContent);
          }}
        />
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-[#ffffff] border border-[#e4e4e7] rounded-3xl p-6 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#000000]">Share &quot;{project.name}&quot;</h3>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="text-xs font-bold text-[#666666] hover:text-[#000000]"
              >
                ✕
              </button>
            </div>

            {/* Invite Form */}
            <form onSubmit={handleShareSubmit} className="flex flex-col gap-3">
              <label htmlFor="share-email" className="text-xs font-bold text-[#000000]">
                Invite by Email
              </label>
              <div className="flex gap-2">
                <input
                  id="share-email"
                  type="email"
                  placeholder="e.g. bob@braid.app"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-[#faf8f5] border border-[#e4e4e7] text-xs text-[#000000] outline-none focus:border-[#000000]"
                />
                <select
                  value={shareRole}
                  onChange={(e) => setShareRole(e.target.value as 'EDITOR' | 'VIEWER')}
                  className="px-3 py-2 rounded-xl bg-[#faf8f5] border border-[#e4e4e7] text-xs font-bold text-[#000000] outline-none"
                >
                  <option value="EDITOR">Editor</option>
                  <option value="VIEWER">Viewer</option>
                </select>
                <button
                  type="submit"
                  disabled={isSharing}
                  className="px-4 py-2 rounded-xl bg-[#000000] text-[#ffffff] text-xs font-bold hover:opacity-90 disabled:opacity-50"
                >
                  Invite
                </button>
              </div>

              {shareError && <p className="text-xs text-red-600 font-medium">{shareError}</p>}
              {shareSuccess && <p className="text-xs text-emerald-600 font-medium">{shareSuccess}</p>}
            </form>

            {/* Active Members List */}
            <div className="flex flex-col gap-2 pt-2 border-t border-[#e4e4e7]">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#666666]">
                Collaborators ({members.length + 1})
              </div>

              {/* Owner */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#faf8f5]">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#ececf0] flex items-center justify-center text-xs font-bold">
                    {user.avatar || '👤'}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold">{user.name} (You)</span>
                    <span className="text-[10px] text-[#666666]">{user.email}</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-neutral-200 text-neutral-800 px-2 py-0.5 rounded-full">
                  OWNER
                </span>
              </div>

              {/* Shared Members */}
              {members.map((m) => (
                <div key={m.user.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-[#faf8f5]">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#ececf0] flex items-center justify-center text-xs font-bold">
                      {m.user.avatar || '👤'}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold">{m.user.name}</span>
                      <span className="text-[10px] text-[#666666]">{m.user.email}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                      {m.role}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(m.user.id)}
                      className="p-1 hover:text-red-600 text-xs"
                      title="Remove Member"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
