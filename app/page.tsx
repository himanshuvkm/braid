'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { generateRoomId, setStoredUserName, getStoredUserName } from '../lib/room-storage';
import { DOCUMENT_TEMPLATES, type TemplateItem } from '../lib/templates';
import { Icons } from '../components/ui/icons';
import { AuthCorner } from '../components/layout/AuthCorner';
import { PreviousDocumentsSidebar } from '../components/layout/PreviousDocumentsSidebar';
import { ThemeToggle } from '../components/ui/theme-toggle';
import { HeroShowcase } from '../components/landing/HeroShowcase';

export default function Home() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [isJoinMode, setIsJoinMode] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('blank');
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = getStoredUserName();
    if (stored && stored.trim()) {
      setUserName(stored);
    }
  }, []);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = userName.trim();
    if (!trimmedName) {
      setError('Please enter your name to start');
      return;
    }

    setStoredUserName(trimmedName);

    if (isJoinMode) {
      let rawId = joinCode.trim();
      if (rawId.includes('/doc/')) {
        rawId = rawId.split('/doc/')[1].split('?')[0].split('#')[0];
      } else if (rawId.includes('/project/')) {
        rawId = rawId.split('/project/')[1].split('?')[0].split('#')[0];
      } else if (rawId.includes('/')) {
        const parts = rawId.split('/');
        rawId = parts[parts.length - 1].split('?')[0].split('#')[0];
      }

      if (!rawId) {
        setError('Please enter a valid room code or link');
        return;
      }
      router.push(`/${encodeURIComponent(rawId)}`);
    } else {
      const newRoomId = generateRoomId();
      // If template is chosen other than blank, we can pass template query or store starter
      if (selectedTemplate !== 'blank') {
        const template = DOCUMENT_TEMPLATES.find((t) => t.id === selectedTemplate);
        if (template && typeof sessionStorage !== 'undefined') {
          try {
            sessionStorage.setItem(`braid:template:${newRoomId}`, template.content);
          } catch {}
        }
      }
      router.push(`/${newRoomId}`);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text)] flex flex-col selection:bg-[var(--accent-subtle)] selection:text-[var(--accent)] relative transition-colors mesh-bg overflow-x-hidden">
      {/* Top Left: Login Detail / Login Button */}
      <AuthCorner />

      {/* Top Right: Theme Toggle */}
      <div className="fixed top-3 right-3 sm:top-4 sm:right-4 z-30 flex items-center gap-2">
        <Link
          href="/dashboard"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-semibold text-[var(--text)] transition-all shadow-xs"
        >
          <span>Dashboard</span>
          <Icons.ArrowRight size={12} />
        </Link>
        <ThemeToggle />
      </div>

      {/* Bottom Right: Previous Documents Sidebar Drawer */}
      <PreviousDocumentsSidebar />

      {/* Hero Section Container */}
      <main className="flex-1 flex flex-col items-center justify-start pt-20 sm:pt-28 pb-16 px-4 sm:px-6 max-w-6xl mx-auto w-full">
        {/* Animated Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-panel border border-[var(--border-glow)] text-[11px] font-mono text-[var(--text)] shadow-xs animate-fade-in mb-6">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Powered by Custom RGA CRDTs & Lamport Clocks</span>
        </div>

        {/* Hero Title & Subtitle */}
        <div className="flex flex-col items-center text-center max-w-3xl gap-4 animate-fade-in">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-[var(--text)] leading-[1.15]">
            Where technical thoughts <br />
            <span className="text-gradient-accent">intertwine in real time.</span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-[var(--text-muted)] max-w-2xl leading-relaxed">
            Blazing-fast, conflict-free collaborative workspace for engineering specs, multi-language code snippets, and team documents with guaranteed mathematical convergence.
          </p>
        </div>

        {/* Interactive Workspace Launcher Card */}
        <div className="w-full max-w-md mt-10 rounded-2xl sm:rounded-3xl glass-card p-6 sm:p-8 shadow-2xl border border-[var(--border)] animate-fade-in">
          <form onSubmit={handleStart} className="flex flex-col gap-4">
            {/* Direct Name Input */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="user-name-input" className="text-xs font-semibold text-[var(--text-muted)]">
                Your Display Name
              </label>
              <div className="relative">
                <input
                  id="user-name-input"
                  type="text"
                  placeholder="e.g. Alex"
                  value={userName}
                  onChange={(e) => {
                    setUserName(e.target.value);
                    if (error) setError('');
                  }}
                  autoFocus
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] text-sm text-[var(--text)] placeholder-[var(--text-subtle)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface)] transition-all shadow-inner focus:ring-2 focus:ring-[var(--accent)]/20"
                />
              </div>
            </div>

            {/* Template Selector (Only in Create Mode) */}
            {!isJoinMode && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-[var(--text-muted)] flex items-center justify-between">
                  <span>Starter Template</span>
                  <span className="text-[10px] font-normal text-[var(--text-subtle)]">Optional</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {DOCUMENT_TEMPLATES.map((tmpl) => {
                    const isSelected = selectedTemplate === tmpl.id;
                    return (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => setSelectedTemplate(tmpl.id)}
                        className={`px-3 py-2 rounded-xl text-left text-xs transition-all flex flex-col gap-0.5 border cursor-pointer ${
                          isSelected
                            ? 'bg-[var(--accent-subtle)] border-[var(--accent)] text-[var(--text)] shadow-xs'
                            : 'bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] border-[var(--border)] text-[var(--text-muted)]'
                        }`}
                      >
                        <span className="font-semibold text-[var(--text)] truncate">{tmpl.title}</span>
                        <span className="text-[10px] text-[var(--text-subtle)] truncate">{tmpl.tag}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Join Code Input (Only in Join Mode) */}
            {isJoinMode && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="room-code-input" className="text-xs font-semibold text-[var(--text-muted)]">
                  Room Code or Invite Link
                </label>
                <input
                  id="room-code-input"
                  type="text"
                  placeholder="e.g. doc-4k9z2a or paste full URL"
                  value={joinCode}
                  onChange={(e) => {
                    setJoinCode(e.target.value);
                    if (error) setError('');
                  }}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] text-sm font-mono text-[var(--text)] placeholder-[var(--text-subtle)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface)] transition-all shadow-inner focus:ring-2 focus:ring-[var(--accent)]/20"
                />
              </div>
            )}

            {error && <p className="text-xs text-rose-400 font-medium px-1">{error}</p>}

            {/* Primary Action Button */}
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs sm:text-sm font-bold transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer mt-1 shadow-lg glow-accent"
            >
              <span>{isJoinMode ? 'Join Collaborative Room' : 'Start Instant Workspace'}</span>
              <Icons.ArrowRight size={14} />
            </button>
          </form>

          {/* Mode Switcher */}
          <div className="flex items-center justify-center gap-3 text-xs text-[var(--text-muted)] mt-4 pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => {
                setIsJoinMode(!isJoinMode);
                setError('');
              }}
              className="hover:text-[var(--text)] transition-colors cursor-pointer font-medium"
            >
              {isJoinMode ? '← Create a new instant document' : 'Have an invite code? Join existing room'}
            </button>
          </div>
        </div>

        {/* Live Hero Interactive Preview Showcase */}
        <HeroShowcase />
      </main>

      {/* Footer */}
      <footer className="w-full py-6 border-t border-[var(--border)] bg-[var(--surface)]/60 backdrop-blur-md text-xs text-[var(--text-subtle)] text-center flex flex-col sm:flex-row items-center justify-between px-6 max-w-6xl mx-auto gap-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-[var(--surface-muted)] border border-[var(--border)] flex items-center justify-center text-[var(--text)]">
            <Icons.Logo size={12} />
          </div>
          <span className="font-bold text-[var(--text)]">Braid</span>
          <span>• Real-time collaborative document & code engine</span>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/login" className="hover:text-[var(--text)] transition-colors">Sign In</Link>
          <Link href="/dashboard" className="hover:text-[var(--text)] transition-colors">Dashboard</Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[var(--text)] transition-colors flex items-center gap-1"
          >
            <Icons.GitHub size={13} />
            <span>GitHub</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
