import React from 'react';
import { Icons } from '../ui/icons';

export function EditorMockup() {
  return (
    <div className="w-full overflow-hidden border border-[var(--line)] bg-[var(--surface)] shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
      {/* Top Application Bar */}
      <div className="flex h-10 items-center justify-between border-b border-[var(--line)] bg-[var(--surface)] px-3 sm:px-4">
        {/* Left: App title / breadcrumbs */}
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center bg-[var(--accent)] text-white">
            <Icons.Logo size={12} />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink)] font-semibold">Braid</span>
          <span className="text-[var(--border-strong)]">/</span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">DOCUMENT</span>
        </div>

        {/* Right: Collaborators & Share */}
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          {/* Avatars */}
          <div className="flex items-center -space-x-1.5">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#ff4b2b] text-[9px] font-mono font-medium text-white ring-2 ring-[var(--surface)]" title="Ajay">
              A
            </div>
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#8b5cf6] text-[9px] font-mono font-medium text-white ring-2 ring-[var(--surface)]" title="Sarah">
              S
            </div>
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#10b981] text-[9px] font-mono font-medium text-white ring-2 ring-[var(--surface)]" title="Chen">
              C
            </div>
          </div>

          {/* 3 Online indicator */}
          <div className="flex items-center gap-1.5 border border-[var(--line)] bg-[var(--surface-muted)]/50 px-2 py-0.5 text-[9px] font-mono text-[var(--muted)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#10b981] animate-pulse" />
            <span>3 online</span>
          </div>

          {/* Share button */}
          <button
            type="button"
            className="flex items-center gap-1 border border-[var(--line)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[var(--ink)] hover:border-[var(--ink)]"
          >
            <Icons.Share size={10} />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </div>

      {/* Main Window Container */}
      <div className="grid grid-cols-1 md:grid-cols-[140px_1fr]">
        {/* Left Explorer Sidebar */}
        <aside className="hidden border-r border-[var(--line)] bg-[var(--paper)]/40 p-3 md:flex md:flex-col md:justify-between text-[10px] font-mono">
          <div className="space-y-4">
            <div>
              <div className="text-[8px] uppercase tracking-widest text-[var(--text-subtle)] pb-1.5">Explorer</div>
              <ul className="space-y-1">
                <li className="flex items-center gap-1.5 bg-[var(--surface)] border border-[var(--line)] px-2 py-1 text-[var(--ink)] font-medium">
                  <Icons.Document size={11} className="text-[var(--accent)]" />
                  <span>Document</span>
                </li>
                <li className="flex items-center gap-1.5 px-2 py-1 text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer">
                  <Icons.Code size={11} />
                  <span>Code</span>
                </li>
                <li className="flex items-center gap-1.5 px-2 py-1 text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer">
                  <Icons.Zap size={11} />
                  <span>Graph</span>
                </li>
                <li className="flex items-center gap-1.5 px-2 py-1 text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer">
                  <Icons.Download size={11} />
                  <span>Export</span>
                </li>
              </ul>
            </div>
          </div>

          <div>
            <div className="text-[8px] uppercase tracking-widest text-[var(--text-subtle)] pb-1.5">Collaborators</div>
            <ul className="space-y-1 text-[9px] text-[var(--muted)]">
              <li className="flex items-center gap-1.5 px-1 py-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#ff4b2b]" />
                <span className="text-[var(--ink)]">Ajay (You)</span>
              </li>
              <li className="flex items-center gap-1.5 px-1 py-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#8b5cf6]" />
                <span>Sarah</span>
              </li>
              <li className="flex items-center gap-1.5 px-1 py-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
                <span>Chen</span>
              </li>
            </ul>
          </div>
        </aside>

        {/* Main Document & Code Content */}
        <div className="p-4 sm:p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3.5">
            {/* Live Document Header */}
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-2">
              <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--muted)]">LIVE DOCUMENT</span>
              <span className="flex items-center gap-1.5 font-mono text-[9px] text-[var(--accent)] font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                RGA ACTIVE
              </span>
            </div>

            {/* Document Content */}
            <div>
              <h3 className="font-display text-2xl sm:text-3xl font-normal tracking-tight text-[var(--ink)]">
                Think together.
              </h3>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[var(--muted)]">
                Write together without waiting for a lock. Braid merges concurrent edits and keeps everyone in sync.
              </p>
            </div>

            {/* Callout Box */}
            <div className="border-l-2 border-[var(--accent)] bg-[var(--surface-muted)]/50 p-2.5 text-xs text-[var(--ink)]">
              Changes are applied locally, then synchronized with collaborators.
            </div>

            {/* Dark Code Panel */}
            <div className="overflow-hidden border border-[#2d2d2d] bg-[#1D1D1D] text-[#e4e2db]">
              <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5 font-mono text-[9px] text-white/50 bg-[#161616]">
                <div className="flex items-center gap-2">
                  <span className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-[#ff5f56]" />
                    <span className="h-2 w-2 rounded-full bg-[#ffbd2e]" />
                    <span className="h-2 w-2 rounded-full bg-[#27c93f]" />
                  </span>
                  <span className="ml-1 text-[#d4d4d4]">crdt / operation.ts</span>
                </div>
                <span className="text-[8px] text-white/40 uppercase">TypeScript</span>
              </div>
              <pre className="overflow-x-auto p-3.5 font-mono text-[11px] leading-5 text-[#e4e2db]">
                <code>
                  <span className="text-[#ff7b72]">const</span> <span className="text-[#79c0ff]">operation</span> = &#123;{'\n'}
                  {'  '}type: <span className="text-[#a5d6ff]">&apos;insert&apos;</span>,{'\n'}
                  {'  '}siteId: <span className="text-[#a5d6ff]">&apos;site-a1c2&apos;</span>,{'\n'}
                  {'  '}clock: <span className="text-[#f2cc60]">42</span>,{'\n'}
                  {'  '}value: <span className="text-[#a5d6ff]">&apos;hello&apos;</span>{'\n'}
                  &#125;;
                </code>
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="flex flex-wrap items-center justify-between border-t border-[var(--line)] bg-[var(--paper)]/70 px-3 py-1.5 font-mono text-[9px] text-[var(--muted)]">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--text-subtle)]">MODE</span>
            <span className="text-[var(--ink)] font-medium">TEXT</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--text-subtle)]">SYNC</span>
            <span className="text-[var(--ink)] font-medium">LIVE</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--text-subtle)]">FORMAT</span>
            <span className="text-[var(--ink)] font-medium">RGA</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[var(--accent)] font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
          <span>SYNCED</span>
        </div>
      </div>
    </div>
  );
}
