'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { Editor } from '../editor/Editor';
import type { User, Project, ProjectRole } from '../../lib/db';
import { Icons } from '../ui/icons';
import { Button } from '../ui/button';
import { IconButton } from '../ui/icon-button';
import { Badge } from '../ui/badge';
import { Avatar } from '../ui/avatar';
import { Modal } from '../ui/modal';
import { useToast } from '../ui/toast';

interface ProjectEditorProps {
  project: Project;
  user: User;
  role: ProjectRole;
  initialWsToken?: string;
}

export type AutoSaveStatus = 'saved' | 'saving' | 'offline' | 'error';

export function ProjectEditor({ project, user, role, initialWsToken }: ProjectEditorProps) {
  const { toast } = useToast();
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
      toast(`Invited ${shareEmail}`);
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
        toast('Member removed');
      }
    } catch {}
  };

  const handleCopyShareLink = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast('Share link copied to clipboard');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#faf9f6] text-[#191919] selection:bg-[#191919]/10">
      {/* Top Project Navigation & Workspace Bar */}
      <header className="bg-[#faf9f6]/95 backdrop-blur-md border-b border-[#e8e6e1] px-4 sm:px-6 h-14 flex items-center justify-between gap-3 sticky top-0 z-30">
        {/* Left: Breadcrumbs & Project Info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            href="/dashboard"
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-[#64635e] hover:text-[#191919] hover:bg-[#eeede8] transition-colors shrink-0"
          >
            <Icons.ArrowLeft size={13} />
            <span className="hidden sm:inline">Workspace</span>
          </Link>

          <span className="text-[#d4d2cc] text-xs">/</span>

          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-xs sm:text-sm text-[#191919] tracking-tight truncate max-w-[180px] sm:max-w-xs md:max-w-md">
              {project.name}
            </span>
            <Badge
              variant={
                role === 'OWNER'
                  ? 'neutral'
                  : role === 'EDITOR'
                  ? 'blue'
                  : 'warning'
              }
              size="sm"
            >
              {role}
            </Badge>
          </div>
        </div>

        {/* Right: Autosave Status, Share, & User Identity */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Autosave Status Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f4f3ef] border border-[#e8e6e1] text-[11px] font-medium">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                saveStatus === 'saved'
                  ? 'bg-emerald-500'
                  : saveStatus === 'saving'
                  ? 'bg-amber-500 animate-pulse'
                  : saveStatus === 'offline'
                  ? 'bg-amber-600'
                  : 'bg-red-500'
              }`}
            />
            <span className="text-[#64635e]">
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
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setShowShareModal(true);
                fetchMembers();
              }}
              leftIcon={<Icons.Share size={12} />}
            >
              Share
            </Button>
          )}

          {/* User Profile */}
          <div className="flex items-center gap-2 pl-1 border-l border-[#e8e6e1]">
            <Avatar name={user.name} size="sm" />
            <span className="text-xs font-medium text-[#191919] hidden md:inline">{user.name}</span>
          </div>
        </div>
      </header>

      {/* Main Collaborative Block Editor Surface */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-8 py-8">
        <Editor
          documentId={project.id}
          initialRoomName={project.name}
          userName={user.name}
          userId={user.id}
          wsToken={initialWsToken}
          isReadOnly={role === 'VIEWER'}
          initialContent={project.content}
          onContentChange={(newContent) => {
            triggerAutoSave(newContent);
          }}
        />
      </main>

      {/* Standardized Share Modal */}
      <Modal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title={`Share "${project.name}"`}
        description="Invite teammates or share a direct link."
        maxWidth="md"
      >
        <div className="flex flex-col gap-4">
          {/* Quick Copy Link */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#f4f3ef] border border-[#e8e6e1]">
            <div className="flex items-center gap-2 text-xs text-[#191919] font-medium">
              <Icons.Document size={14} className="text-[#64635e]" />
              <span>Anyone with project access</span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyShareLink}
              leftIcon={<Icons.Copy size={11} />}
            >
              Copy Link
            </Button>
          </div>

          {/* Invite Form */}
          <form onSubmit={handleShareSubmit} className="flex flex-col gap-3">
            <label htmlFor="share-email-input" className="text-xs font-semibold text-[#191919]">
              Invite Collaborator by Email
            </label>
            <div className="flex gap-2">
              <input
                id="share-email-input"
                type="email"
                placeholder="e.g. bob@braid.app"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-xl bg-[#faf9f6] border border-[#e8e6e1] text-xs text-[#191919] outline-none focus:border-[#191919] focus:bg-[#ffffff] transition-all"
              />
              <select
                value={shareRole}
                onChange={(e) => setShareRole(e.target.value as 'EDITOR' | 'VIEWER')}
                className="px-3 py-1.5 rounded-xl bg-[#faf9f6] border border-[#e8e6e1] text-xs font-semibold text-[#191919] outline-none cursor-pointer"
              >
                <option value="EDITOR">Editor</option>
                <option value="VIEWER">Viewer</option>
              </select>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSharing}
              >
                Invite
              </Button>
            </div>

            {shareError && (
              <p className="text-xs text-red-600 font-medium animate-fade-in">{shareError}</p>
            )}
            {shareSuccess && (
              <p className="text-xs text-emerald-600 font-medium animate-fade-in">{shareSuccess}</p>
            )}
          </form>

          {/* Active Members List */}
          <div className="flex flex-col gap-2 pt-2 border-t border-[#e8e6e1]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#9a9994]">
              Collaborators ({members.length + 1})
            </div>

            {/* Owner */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-[#faf9f6] border border-[#e8e6e1]/60">
              <div className="flex items-center gap-2.5">
                <Avatar name={user.name} size="xs" />
                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold text-[#191919]">{user.name} (You)</span>
                  <span className="text-[10px] text-[#9a9994]">{user.email}</span>
                </div>
              </div>
              <Badge variant="neutral" size="sm">
                OWNER
              </Badge>
            </div>

            {/* Shared Members */}
            {members.map((m) => (
              <div
                key={m.user.id}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-[#faf9f6] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Avatar name={m.user.name} color="#3b82f6" size="xs" />
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-semibold text-[#191919]">{m.user.name}</span>
                    <span className="text-[10px] text-[#9a9994]">{m.user.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="blue" size="sm">
                    {m.role}
                  </Badge>
                  <IconButton
                    aria-label="Remove collaborator"
                    variant="danger"
                    size="sm"
                    onClick={() => handleRemoveMember(m.user.id)}
                  >
                    <Icons.X size={12} />
                  </IconButton>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
