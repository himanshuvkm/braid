'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { generateRoomId, setStoredUserName, getStoredUserName } from '../lib/room-storage';
import { DOCUMENT_TEMPLATES } from '../lib/templates';
import { Icons } from '../components/ui/icons';
import { AuthCorner } from '../components/layout/AuthCorner';
import { PreviousDocumentsSidebar } from '../components/layout/PreviousDocumentsSidebar';
import { HeroShowcase } from '../components/landing/HeroShowcase';
import { ThemeToggle } from '../components/ui/theme-toggle';
import { MetadataRow, TechnicalLabel } from '../components/design';

export default function Home() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [isJoinMode, setIsJoinMode] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('blank');
  const [error, setError] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      const stored = getStoredUserName();
      if (stored && stored.trim()) {
        setUserName(stored);
      }
    }, 0);
    return () => clearTimeout(timer);
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
    <div className="min-h-screen overflow-x-hidden bg-[var(--background)] text-[var(--ink)] selection:bg-[var(--accent-subtle)] selection:text-[var(--ink)]">
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--paper)]/95 backdrop-blur-sm">
        <nav className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-8 lg:px-12" aria-label="Main navigation">
          <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Braid home">
            <span className="flex h-7 w-7 items-center justify-center bg-[var(--accent)] text-white"><Icons.Logo size={15} /></span>
            <span className="font-display text-xl tracking-tight">Braid</span>
          </Link>
          <TechnicalLabel className="hidden md:block">REAL-TIME COLLABORATIVE WORKSPACE</TechnicalLabel>
          <div className="flex items-center gap-3 sm:gap-5">
            <a href="https://github.com/himanshuvkm/braid#-project-structure" target="_blank" rel="noreferrer" className="hidden text-[10px] font-mono uppercase tracking-wider text-[var(--muted)] hover:text-[var(--ink)] sm:inline">Docs</a>
            <a href="#architecture" className="hidden text-[10px] font-mono uppercase tracking-wider text-[var(--muted)] hover:text-[var(--ink)] lg:inline">Architecture</a>
            <a href="https://github.com/himanshuvkm/braid" target="_blank" rel="noreferrer" className="hidden text-[10px] font-mono uppercase tracking-wider text-[var(--muted)] hover:text-[var(--ink)] sm:inline">GitHub</a>
            <AuthCorner layout="inline" className="text-[10px] font-mono uppercase tracking-wider" />
            <ThemeToggle />
            <a href="#open-braid" className="inline-flex h-9 items-center gap-2 bg-[var(--accent)] px-3 font-mono text-[10px] font-semibold uppercase tracking-wider text-white hover:bg-[var(--accent-hover)] sm:px-4">Open editor <Icons.ArrowRight size={12} /></a>
          </div>
        </nav>
      </header>

      {/* Bottom Right: Previous Documents Sidebar Drawer */}
      <PreviousDocumentsSidebar />

      {/* Hero Section Container */}
      <main className="editorial-grid mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-4 pb-12 sm:px-8 lg:px-12">
        <section className="grid gap-10 border-b border-[var(--line)] py-16 sm:py-20 lg:grid-cols-12 lg:gap-12 lg:py-28">
          <div className="lg:col-span-7">
            <div className="mb-7 flex items-center gap-3"><span className="font-mono text-[11px] text-[var(--accent)]">01</span><span className="h-px w-10 bg-[var(--line)]" /><TechnicalLabel>REAL-TIME COLLABORATION</TechnicalLabel></div>
            <h1 className="max-w-4xl font-display text-5xl font-normal leading-[0.92] tracking-[-0.055em] sm:text-7xl lg:text-6xl xl:text-[6.5rem]">A real-time<br />workspace<br /><em className="text-[var(--accent)]">for modern teams.</em></h1>
            <p className="mt-7 max-w-xl text-sm leading-7 text-[var(--muted)] sm:text-base">Minimal real-time collaborative editor for modern teams—blazing-fast, conflict-free documents and code powered by a custom RGA CRDT.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#open-braid" className="inline-flex h-11 items-center gap-4 bg-[var(--accent)] px-5 font-mono text-[10px] font-semibold uppercase tracking-wider text-white hover:bg-[var(--accent-hover)]">Open Braid <Icons.ArrowRight size={13} /></a>
              <a href="https://github.com/himanshuvkm/braid" target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-3 border border-[var(--line)] px-5 font-mono text-[10px] uppercase tracking-wider hover:border-[var(--ink)]">View on GitHub <Icons.ArrowRight size={13} /></a>
            </div>
          </div>
          <div className="flex items-center lg:col-span-5">
            <div className="blueprint-canvas w-full border border-[var(--line)] p-4 sm:p-6">
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-3"><TechnicalLabel>LIVE DOCUMENT / RGA</TechnicalLabel><span className="font-mono text-[9px] text-[var(--muted)]">BRAID / 01</span></div>
              <div className="relative my-8 border-y border-[var(--line)] bg-[var(--paper)] p-5 sm:p-7">
                <span className="absolute -left-1 top-8 h-3 w-1 bg-[var(--accent)]" />
                <TechnicalLabel>DOCUMENT / OVERVIEW</TechnicalLabel>
                <div className="mt-5 font-display text-3xl">Think together.</div>
                <div className="mt-4 h-px w-4/5 bg-[var(--line)]" /><div className="mt-2 h-px w-3/5 bg-[var(--line)]" />
                <div className="mt-5 border-l border-[var(--accent)] pl-3 font-mono text-[10px] leading-5 text-[var(--muted)]">op(site-a, 041) ─────┐<br />op(site-b, 038) ────┼──→ merged sequence<br />op(site-c, 012) ────┘</div>
              </div>
              <div className="flex items-center justify-between"><MetadataRow items={[{ label: 'SYNC', value: 'LIVE' }, { label: 'NODES', value: 'RGA' }]} /><span className="flex -space-x-1"><span className="flex h-6 w-6 items-center justify-center border border-[var(--paper)] bg-[var(--ink)] font-mono text-[9px] text-[var(--paper)]">A</span><span className="flex h-6 w-6 items-center justify-center border border-[var(--paper)] bg-[var(--accent)] font-mono text-[9px] text-white">B</span></span></div>
            </div>
          </div>
        </section>

        {/* Interactive Workspace Launcher Card */}
        <div id="open-braid" className="scroll-mt-20 grid w-full gap-8 border-b border-[var(--line)] py-10 sm:py-14 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-4"><span className="font-mono text-[11px] uppercase tracking-wider text-[var(--accent)]">Start a room</span><h2 className="mt-4 font-display text-3xl sm:text-4xl">Open a workspace.</h2><p className="mt-3 max-w-sm text-xs leading-6 text-[var(--muted)]">Create a document for your team or join an existing room with its invite link.</p></div>
          <div className="w-full border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-6 lg:col-span-8">
          <form onSubmit={handleStart} className="flex flex-col gap-4">
            {/* Direct Name Input */}
            <div className="flex flex-col gap-1.5">
                <label htmlFor="user-name-input" className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">
                Your Display Name
              </label>
              <div className="relative">
                <input
                  id="user-name-input"
                  type="text"
                  placeholder="Your name..."
                  value={userName}
                  onChange={(e) => {
                    setUserName(e.target.value);
                    if (error) setError('');
                  }}
                  autoFocus
                  required
                  className="w-full border-b border-[var(--line)] bg-transparent px-0 py-3 text-sm text-[var(--ink)] placeholder-[var(--text-subtle)] outline-none focus:border-[var(--accent)] focus:ring-0"
                />
              </div>
            </div>

            {/* Template Selector (Only in Create Mode) */}
            {!isJoinMode && (
              <div className="flex flex-col gap-2">
                <label className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">
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
                        className={`border px-3 py-3 text-left text-xs transition-colors flex flex-col gap-0.5 cursor-pointer ${
                          isSelected
                            ? 'bg-[var(--accent-subtle)] border-[var(--accent)] text-[var(--ink)]'
                            : 'bg-transparent hover:bg-[var(--surface-muted)] border-[var(--line)] text-[var(--muted)]'
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
                <label htmlFor="room-code-input" className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">
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
                  className="w-full border-b border-[var(--line)] bg-transparent px-0 py-3 text-sm font-mono text-[var(--ink)] placeholder-[var(--text-subtle)] outline-none focus:border-[var(--accent)] focus:ring-0"
                />
              </div>
            )}

            {error && <p className="text-xs text-rose-400 font-medium px-1">{error}</p>}

            {/* Primary Action Button */}
            <button
              type="submit"
              className="mt-1 flex h-11 w-full items-center justify-center gap-2 bg-[var(--accent)] text-xs font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] sm:text-sm"
            >
              <span>{isJoinMode ? 'Join Room' : 'Start Writing'}</span>
              <Icons.ArrowRight size={14} />
            </button>
          </form>

          {/* Mode Switcher */}
          <div className="mt-4 flex items-center justify-center gap-3 border-t border-[var(--line)] pt-3 text-xs text-[var(--muted)]">
            <button
              type="button"
              onClick={() => {
                setIsJoinMode(!isJoinMode);
                setError('');
              }}
              className="font-mono text-[10px] uppercase tracking-wider hover:text-[var(--ink)]"
            >
              {isJoinMode ? '← Create a new room' : 'Have a room code? Join room'}
            </button>
          </div>
        </div>
        </div>

        {/* Live Hero Interactive Preview Showcase */}
        <HeroShowcase />
      </main>

      {/* Footer */}
      <footer className="mx-auto flex w-full max-w-[1440px] flex-col items-center justify-between gap-3 border-t border-[var(--line)] px-4 py-6 text-center text-xs text-[var(--muted)] sm:flex-row sm:px-8 sm:text-left lg:px-12">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-[var(--surface-muted)] border border-[var(--border)] flex items-center justify-center text-[var(--text)]">
            <Icons.Logo size={12} />
          </div>
          <span className="font-display text-lg text-[var(--ink)]">Braid</span>
          <span>Real-time collaborative document &amp; code editor.</span>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/login" className="hover:text-[var(--ink)] transition-colors">Sign in</Link>
          <a href="#architecture" className="hover:text-[var(--ink)] transition-colors">Architecture</a>
          <a href="https://github.com/himanshuvkm/braid#-project-structure" target="_blank" rel="noreferrer" className="hover:text-[var(--ink)] transition-colors">Docs</a>
          <a
            href="https://github.com/himanshuvkm/braid"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[var(--ink)] transition-colors flex items-center gap-1"
          >
            <Icons.GitHub size={13} />
            <span>GitHub</span>
          </a>
          <a href="https://github.com/himanshuvkm/braid/blob/main/LICENSE" target="_blank" rel="noreferrer" className="hover:text-[var(--ink)] transition-colors">License</a>
        </div>
      </footer>
    </div>
  );
}
