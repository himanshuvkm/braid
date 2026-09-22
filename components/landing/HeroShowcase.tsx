'use client';

import React, { useState, useEffect } from 'react';
import { Icons } from '../ui/icons';

export function HeroShowcase() {
  const [activeTab, setActiveTab] = useState<'preview' | 'crdt' | 'export'>('preview');
  const [simulatedCursor, setSimulatedCursor] = useState({ x: 45, y: 35 });

  useEffect(() => {
    const interval = setInterval(() => {
      setSimulatedCursor({
        x: 35 + Math.random() * 30,
        y: 25 + Math.random() * 35,
      });
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-10 mt-6">
      {/* Live Collaborative Interactive Preview Canvas */}
      <div className="relative rounded-2xl sm:rounded-3xl glass-card overflow-hidden shadow-2xl border border-[var(--border)] animate-fade-in">
        {/* Top Window Header */}
        <div className="px-4 sm:px-6 py-3 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            </div>
            <span className="text-[11px] text-[var(--text-subtle)] font-mono ml-2 hidden sm:inline">
              braid://workspace/rfc-distributed-sync
            </span>
          </div>

          {/* Active Collaborators Cluster */}
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5 overflow-hidden items-center">
              <div
                className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold text-zinc-950 ring-2 ring-[var(--surface)] shrink-0"
                style={{ backgroundColor: '#F5C6B0' }}
                title="Alex (Editor)"
              >
                A
              </div>
              <div
                className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold text-zinc-950 ring-2 ring-[var(--surface)] shrink-0"
                style={{ backgroundColor: '#B0D0F5' }}
                title="Jordan (Viewer)"
              >
                J
              </div>
              <div
                className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold text-zinc-950 ring-2 ring-[var(--surface)] shrink-0"
                style={{ backgroundColor: '#B0F5D0' }}
                title="Sarah (Editor)"
              >
                S
              </div>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>3 peers active</span>
            </span>
          </div>
        </div>

        {/* Editor Body Preview with Simulated Peer Cursors */}
        <div className="p-5 sm:p-8 flex flex-col gap-4 font-sans text-sm relative min-h-[300px]">
          {/* Simulated Peer Cursor 1 */}
          <div
            className="absolute transition-all duration-1000 ease-out pointer-events-none hidden sm:flex items-center gap-1 z-20"
            style={{ top: `${simulatedCursor.y}%`, left: `${simulatedCursor.x}%` }}
          >
            <div className="w-0.5 h-5 bg-[#ff5733] shadow-xs" />
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-[#ff5733] text-white shadow-md">
              Alex
            </span>
          </div>

          {/* Heading Block */}
          <div className="flex items-center gap-3">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text)]">
              # RFC: High-Throughput Replicated Growable Array (RGA)
            </span>
          </div>

          {/* Callout Box */}
          <div className="p-3.5 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] flex items-start gap-3 text-xs sm:text-sm text-[var(--text)]">
            <Icons.Info size={18} className="text-[var(--accent)] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-[var(--text)]">Deterministic Causality: </span>
              <span className="text-[var(--text-muted)]">
                Lamport clocks with tie-breaking site IDs guarantee mathematical convergence without central locking.
              </span>
            </div>
          </div>

          {/* Code Block Snippet */}
          <div className="rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] p-4 font-mono text-xs flex flex-col gap-2 shadow-inner">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)] text-[11px] text-[var(--text-subtle)]">
              <span className="text-emerald-400 font-semibold">engine.ts (TypeScript)</span>
              <span className="text-[10px] font-mono">0.4ms avg latency</span>
            </div>
            <pre className="text-[var(--text)] overflow-x-auto leading-relaxed">
              <code>{`export class RGAEngine {
  insert(cursor: OpId | null, value: string): Op {
    const lamport = ++this.clock;
    return { type: 'insert', id: { siteId: this.siteId, clock: lamport }, cursor, value };
  }
}`}</code>
            </pre>
          </div>

          {/* Checklist Block */}
          <div className="flex flex-col gap-2 pt-1 text-xs sm:text-sm">
            <div className="flex items-center gap-2 text-[var(--text)]">
              <span className="w-4 h-4 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                ✓
              </span>
              <span>Sub-millisecond local character insert latency</span>
            </div>
            <div className="flex items-center gap-2 text-[var(--text-muted)]">
              <span className="w-4 h-4 rounded bg-[var(--surface-muted)] border border-[var(--border)] flex items-center justify-center text-[10px]" />
              <span>Offline edits causal buffer & automatic reconnection sync</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Spotlight Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {/* Card 1: CRDTs */}
        <div className="glass-card rounded-2xl p-6 flex flex-col gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center shadow-xs">
            <Icons.Cpu size={20} />
          </div>
          <h3 className="text-base font-bold tracking-tight text-[var(--text)]">
            Custom RGA CRDT Engine
          </h3>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Deterministic convergence with Lamport causality tracking and tombstone garbage collection. Never lose an edit.
          </p>
        </div>

        {/* Card 2: Code Studio */}
        <div className="glass-card rounded-2xl p-6 flex flex-col gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-xs">
            <Icons.Code size={20} />
          </div>
          <h3 className="text-base font-bold tracking-tight text-[var(--text)]">
            Multi-Language Code Mode
          </h3>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Collaborate on 12+ programming languages with line numbering gutters, instant code copying, and syntax tabs.
          </p>
        </div>

        {/* Card 3: Multi-Format Export */}
        <div className="glass-card rounded-2xl p-6 flex flex-col gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-xs">
            <Icons.Download size={20} />
          </div>
          <h3 className="text-base font-bold tracking-tight text-[var(--text)]">
            High-Fidelity Document Export
          </h3>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Export any room in one click to publication-ready PDF, Microsoft Word DOCX, Markdown, HTML, or Plain Text.
          </p>
        </div>
      </div>
    </div>
  );
}
