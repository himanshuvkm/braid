'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { generateRoomId, setStoredUserName, getStoredUserName } from '../lib/room-storage';
import { Icons } from '../components/ui/icons';
import { ThemeToggle } from '../components/ui/theme-toggle';
import { EditorMockup } from '../components/landing/EditorMockup';
import { CrdtDiagram } from '../components/landing/CrdtDiagram';

export default function Home() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
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
    const newRoomId = generateRoomId();
    router.push(`/${newRoomId}`);
  };

  const handleStartWritingNav = () => {
    const trimmedName = userName.trim();
    if (trimmedName) {
      setStoredUserName(trimmedName);
      const newRoomId = generateRoomId();
      router.push(`/${newRoomId}`);
    } else {
      const inputEl = document.getElementById('hero-name-input');
      if (inputEl) {
        inputEl.focus();
        inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--background)] text-[var(--ink)] selection:bg-[var(--accent-subtle)] selection:text-[var(--ink)]">
      {/* Top Sticky Navigation */}
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--paper)]/95 backdrop-blur-sm">
        <nav
          className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-8 lg:px-12"
          aria-label="Main navigation"
        >
          {/* Left: Braid Logo & Wordmark */}
          <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Braid home">
            <span className="flex h-7 w-7 items-center justify-center bg-[var(--accent)] text-white">
              <Icons.Logo size={14} />
            </span>
            <span className="font-display text-xl tracking-tight text-[var(--ink)] font-normal">Braid</span>
          </Link>

          {/* Center Links */}
          <div className="hidden md:flex items-center gap-6 lg:gap-8 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
            <a href="#product" className="hover:text-[var(--ink)] transition-colors">
              Product
            </a>
            <a href="#architecture" className="hover:text-[var(--ink)] transition-colors">
              Architecture
            </a>
            <a
              href="https://github.com/himanshuvkm/braid#-project-structure"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[var(--ink)] transition-colors"
            >
              Docs
            </a>
            <a
              href="https://github.com/himanshuvkm/braid"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[var(--ink)] transition-colors"
            >
              GitHub
            </a>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <ThemeToggle />
            <Link
              href="/login"
              className="inline-flex h-8 items-center border border-[var(--line)] px-3 font-mono text-[10px] uppercase tracking-wider text-[var(--ink)] hover:border-[var(--ink)] transition-colors"
            >
              Log in
            </Link>
            <button
              onClick={handleStartWritingNav}
              type="button"
              className="inline-flex h-8 sm:h-9 items-center gap-1.5 bg-[var(--accent)] px-3.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-white hover:bg-[var(--accent-hover)] transition-colors cursor-pointer"
            >
              <span>Start Writing</span>
              <Icons.ArrowRight size={12} />
            </button>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-4 sm:px-8 lg:px-12">
        {/* ==================================================
            01 — HERO SECTION
            ================================================== */}
        <section className="grid grid-cols-1 items-center gap-10 py-12 sm:py-16 lg:grid-cols-12 lg:gap-12 lg:py-20">
          {/* Left Hero Column */}
          <div className="lg:col-span-6">
            {/* Eyebrow */}
            <div className="mb-6 flex items-center gap-3">
              <span className="font-mono text-[11px] font-semibold text-[var(--accent)]">01</span>
              <span className="h-px w-6 bg-[var(--line)]" />
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                Real-Time Collaboration
              </span>
            </div>

            {/* Headline */}
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-normal leading-[0.95] tracking-[-0.04em] text-[var(--ink)]">
              A real-time<br />
              workspace<br />
              <em className="text-[var(--accent)] italic font-display font-normal">for modern teams.</em>
            </h1>

            {/* Subheading */}
            <p className="mt-6 max-w-lg text-sm sm:text-base leading-relaxed text-[var(--muted)]">
              Minimal, fast and conflict-free collaborative editor for documents and code, powered by a custom RGA CRDT.
            </p>

            {/* Name Input & Primary CTA Form */}
            <form onSubmit={handleStart} className="mt-8 flex flex-col gap-2.5 max-w-md">
              <label
                htmlFor="hero-name-input"
                className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)] font-medium"
              >
                ENTER YOUR NAME
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]">
                    <Icons.User size={15} />
                  </span>
                  <input
                    id="hero-name-input"
                    type="text"
                    placeholder="e.g. Ajay"
                    value={userName}
                    onChange={(e) => {
                      setUserName(e.target.value);
                      if (error) setError('');
                    }}
                    className="h-12 w-full border border-[var(--line)] bg-[var(--surface)] pl-10 pr-3 text-sm text-[var(--ink)] placeholder-[var(--text-subtle)] outline-none focus:border-[var(--accent)] focus:ring-0 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  className="h-12 px-6 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-mono text-[11px] font-semibold uppercase tracking-wider flex items-center justify-center gap-2 shrink-0 transition-colors cursor-pointer"
                >
                  <span>Start Writing</span>
                  <Icons.ArrowRight size={13} />
                </button>
              </div>
              {error && <p className="text-xs text-rose-500 font-medium px-1">{error}</p>}
            </form>
          </div>

          {/* Right Hero Column: Realistic Editor Mockup */}
          <div className="lg:col-span-6">
            <EditorMockup />
          </div>
        </section>

        {/* ==================================================
            HERO FEATURE STRIP (4 COLUMNS)
            ================================================== */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-y border-[var(--line)] divide-y sm:divide-y-0 sm:divide-x divide-[var(--line)] bg-[var(--surface)] my-4">
          {[
            {
              number: '01',
              title: 'CONFLICT-FREE SYNC',
              desc: 'Concurrent edits converge through a custom RGA CRDT.',
              icon: <Icons.Zap size={15} />,
            },
            {
              number: '02',
              title: 'LIVE PRESENCE',
              desc: 'See your team working in the same document.',
              icon: <Icons.Users size={15} />,
            },
            {
              number: '03',
              title: 'EXPORT ANYTIME',
              desc: 'Export to PDF and Word with structured output.',
              icon: <Icons.Download size={15} />,
            },
            {
              number: '04',
              title: 'BUILT FOR DEVELOPERS',
              desc: 'A focused code mode with rich text support.',
              icon: <Icons.Code size={15} />,
            },
          ].map((feature) => (
            <div key={feature.number} className="p-5 sm:p-6 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-[var(--accent)] font-semibold">{feature.number}</span>
                <span className="text-[var(--accent)]">{feature.icon}</span>
              </div>
              <h2 className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink)] font-semibold">
                {feature.title}
              </h2>
              <p className="text-xs leading-relaxed text-[var(--muted)]">{feature.desc}</p>
            </div>
          ))}
        </section>

        {/* ==================================================
            02 — SECTION 2: THE WORKSPACE
            ================================================== */}
        <section id="product" className="scroll-mt-20 py-16 sm:py-20 lg:py-24 border-b border-[var(--line)]">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12 items-start">
            {/* Left Column */}
            <div className="lg:col-span-5">
              <div className="mb-6 flex items-center gap-3">
                <span className="font-mono text-[11px] font-semibold text-[var(--accent)]">02</span>
                <span className="h-px w-6 bg-[var(--line)]" />
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                  The Workspace
                </span>
              </div>

              <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-normal leading-[0.98] tracking-[-0.04em] text-[var(--ink)]">
                Write and code<br />
                together, <em className="text-[var(--accent)] italic font-display font-normal">in real time.</em>
              </h2>

              <p className="mt-5 text-sm sm:text-base leading-relaxed text-[var(--muted)]">
                A focused workspace that brings documents and code side by side. Collaborate with live presence,
                version history, and automatic conflict resolution — all in one place.
              </p>

              {/* Checklist */}
              <ul className="mt-8 space-y-3 font-mono text-xs text-[var(--ink)]">
                {[
                  'Live cursors and presence',
                  'Rich text and code blocks',
                  'Automatic conflict resolution',
                  'Version history',
                  'Export to PDF and Word',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5">
                    <span className="flex h-4 w-4 items-center justify-center text-[var(--accent)] font-bold">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right Column: 2x2 Capability Cards */}
            <div className="lg:col-span-7">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    title: 'Rich documents',
                    desc: 'Write technical specs, notes and documentation with a clean, distraction-free editor.',
                    icon: <Icons.Document size={18} />,
                  },
                  {
                    title: 'Code side by side',
                    desc: 'Mix rich text and code blocks with syntax highlighting and language support.',
                    icon: <Icons.Code size={18} />,
                  },
                  {
                    title: 'Real-time collaboration',
                    desc: "See who's working, with live cursors, presence indicators and instant sync.",
                    icon: <Icons.Users size={18} />,
                  },
                  {
                    title: 'Version history',
                    desc: 'Track changes over time and restore previous versions whenever needed.',
                    icon: <Icons.Clock size={18} />,
                  },
                ].map((card) => (
                  <div
                    key={card.title}
                    className="border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6 transition-all hover:border-[var(--border-strong)]"
                  >
                    <div className="mb-4 inline-flex items-center justify-center border border-[var(--line)] bg-[var(--paper)] p-2 text-[var(--accent)]">
                      {card.icon}
                    </div>
                    <h3 className="font-display text-xl font-normal text-[var(--ink)]">{card.title}</h3>
                    <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[var(--muted)]">{card.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================
            03 — SECTION 3: CRDT ARCHITECTURE
            ================================================== */}
        <section id="architecture" className="scroll-mt-20 py-16 sm:py-20 lg:py-24 border-b border-[var(--line)]">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12 items-center">
            {/* Left Column */}
            <div className="lg:col-span-5">
              <div className="mb-6 flex items-center gap-3">
                <span className="font-mono text-[11px] font-semibold text-[var(--accent)]">03</span>
                <span className="h-px w-6 bg-[var(--line)]" />
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                  Built on CRDTs
                </span>
              </div>

              <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-normal leading-[0.98] tracking-[-0.04em] text-[var(--ink)]">
                Engineered<br />
                <em className="text-[var(--accent)] italic font-display font-normal">for real-time.</em>
              </h2>

              <p className="mt-5 text-sm sm:text-base leading-relaxed text-[var(--muted)]">
                Braid uses a custom Replicated Growable Array, Lamport timestamps, and causal buffering to converge
                edits across connected peers.
              </p>
            </div>

            {/* Right Column: Convergence Diagram */}
            <div className="lg:col-span-7">
              <CrdtDiagram />
            </div>
          </div>
        </section>

        {/* ==================================================
            04 — SECTION 4: FOR TEAMS
            ================================================== */}
        <section id="teams" className="scroll-mt-20 py-16 sm:py-20 lg:py-24">
          <div className="max-w-3xl">
            <div className="mb-6 flex items-center gap-3">
              <span className="font-mono text-[11px] font-semibold text-[var(--accent)]">04</span>
              <span className="h-px w-6 bg-[var(--line)]" />
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                For Teams
              </span>
            </div>

            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-normal leading-[0.98] tracking-[-0.04em] text-[var(--ink)]">
              From ideas<br />
              <em className="text-[var(--accent)] italic font-display font-normal">to execution.</em>
            </h2>

            <p className="mt-5 text-sm sm:text-base leading-relaxed text-[var(--muted)]">
              Whether you&apos;re writing specs, planning features, or collaborating on code — Braid keeps everyone
              aligned, in real time.
            </p>
          </div>

          {/* 3 Equal Cards */}
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                title: 'Technical Specs',
                desc: 'Write and review engineering documents together.',
                icon: <Icons.FileText size={20} />,
              },
              {
                title: 'Code Discussions',
                desc: 'Mix rich text and code in one workspace.',
                icon: <Icons.Code size={20} />,
              },
              {
                title: 'Team Collaboration',
                desc: "See who's working on what, in real time.",
                icon: <Icons.Users size={20} />,
              },
            ].map((card) => (
              <div
                key={card.title}
                className="border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-8 transition-colors hover:border-[var(--border-strong)] flex flex-col justify-between"
              >
                <div>
                  <div className="mb-4 inline-flex items-center justify-center border border-[var(--line)] bg-[var(--paper)] p-2.5 text-[var(--accent)]">
                    {card.icon}
                  </div>
                  <h3 className="font-display text-2xl font-normal text-[var(--ink)]">{card.title}</h3>
                  <p className="mt-3 text-xs sm:text-sm leading-relaxed text-[var(--muted)]">{card.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* ==================================================
          STRUCTURED FOOTER
          ================================================== */}
      <footer className="border-t border-[var(--line)] bg-[var(--paper)]">
        <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-8 sm:py-16 lg:px-12">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-12 lg:gap-12">
            {/* Left Column: Brand & Tagline */}
            <div className="md:col-span-4 space-y-4">
              <Link href="/" className="flex items-center gap-2.5" aria-label="Braid home">
                <span className="flex h-7 w-7 items-center justify-center bg-[var(--accent)] text-white">
                  <Icons.Logo size={14} />
                </span>
                <span className="font-display text-xl tracking-tight text-[var(--ink)] font-normal">Braid</span>
              </Link>
              <p className="text-xs sm:text-sm leading-relaxed text-[var(--muted)] max-w-xs">
                Real-time collaborative workspace for modern teams.
              </p>
            </div>

            {/* Middle/Right: Navigation Columns */}
            <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-8">
              {/* Product */}
              <div className="space-y-3">
                <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--ink)] font-semibold">
                  Product
                </span>
                <ul className="space-y-2 text-xs font-mono text-[var(--muted)]">
                  <li>
                    <a href="#product" className="hover:text-[var(--ink)] transition-colors">
                      Features
                    </a>
                  </li>
                  <li>
                    <a href="#architecture" className="hover:text-[var(--ink)] transition-colors">
                      Architecture
                    </a>
                  </li>
                  <li>
                    <a href="#teams" className="hover:text-[var(--ink)] transition-colors">
                      Roadmap
                    </a>
                  </li>
                </ul>
              </div>

              {/* Resources */}
              <div className="space-y-3">
                <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--ink)] font-semibold">
                  Resources
                </span>
                <ul className="space-y-2 text-xs font-mono text-[var(--muted)]">
                  <li>
                    <a
                      href="https://github.com/himanshuvkm/braid#-project-structure"
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-[var(--ink)] transition-colors"
                    >
                      Docs
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://github.com/himanshuvkm/braid"
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-[var(--ink)] transition-colors"
                    >
                      Tutorials
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://github.com/himanshuvkm/braid"
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-[var(--ink)] transition-colors"
                    >
                      Examples
                    </a>
                  </li>
                </ul>
              </div>

              {/* Legal */}
              <div className="space-y-3 col-span-2 sm:col-span-1">
                <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--ink)] font-semibold">
                  Legal
                </span>
                <ul className="space-y-2 text-xs font-mono text-[var(--muted)]">
                  <li>
                    <span className="hover:text-[var(--ink)] cursor-pointer transition-colors">Privacy</span>
                  </li>
                  <li>
                    <span className="hover:text-[var(--ink)] cursor-pointer transition-colors">Terms</span>
                  </li>
                  <li>
                    <span className="hover:text-[var(--ink)] cursor-pointer transition-colors">Security</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom Bar: Copyright & Socials */}
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[var(--line)] pt-6 text-xs text-[var(--muted)]">
            <p className="font-mono text-[10px]">
              &copy; {new Date().getFullYear()} Braid. Powered by pure RGA CRDT.
            </p>
            <div className="flex items-center gap-4 text-[var(--muted)]">
              <a
                href="https://github.com/himanshuvkm/braid"
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub"
                className="hover:text-[var(--ink)] transition-colors"
              >
                <Icons.GitHub size={16} />
              </a>
              <a
                href="https://x.com"
                target="_blank"
                rel="noreferrer"
                aria-label="X (Twitter)"
                className="hover:text-[var(--ink)] transition-colors"
              >
                <Icons.XTwitter size={15} />
              </a>
              <a
                href="https://discord.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Discord"
                className="hover:text-[var(--ink)] transition-colors"
              >
                <Icons.Discord size={16} />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
