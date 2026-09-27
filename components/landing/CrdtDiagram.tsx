import React from 'react';

export function CrdtDiagram() {
  return (
    <figure className="relative border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-7">
      <figcaption className="mb-6 flex items-center justify-between border-b border-[var(--line)] pb-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--muted)]">
          CONCURRENT OPERATIONS / CONVERGENCE
        </span>
        <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
      </figcaption>

      {/* Top row: 3 Users */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {[
          { user: 'USER A', op: 'insert(A)', site: 'site-a1' },
          { user: 'USER B', op: 'insert(B)', site: 'site-b2' },
          { user: 'USER C', op: 'insert(C)', site: 'site-c3' },
        ].map((item) => (
          <div
            key={item.user}
            className="flex flex-col items-center border border-[var(--line)] bg-[var(--paper)]/50 p-3 text-center sm:p-4"
          >
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink)] font-semibold">
              {item.user}
            </span>
            <span className="mt-2 font-mono text-[11px] text-[var(--accent)] font-medium">
              {item.op}
            </span>
            <div className="mt-3 h-4 w-px bg-[var(--accent)]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
          </div>
        ))}
      </div>

      {/* Middle vertical connector */}
      <div className="mx-auto h-6 w-px bg-[var(--line)]" />

      {/* Concurrent Operations Pool */}
      <div className="border border-[var(--line)] bg-[var(--paper)]/40 py-3.5 px-4 text-center">
        <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-subtle)]">
          CONCURRENT OPERATIONS
        </span>
        <div className="mt-2.5 flex justify-center gap-2 sm:gap-3 font-mono text-xs">
          <span className="border border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-[var(--ink)]">
            op 01
          </span>
          <span className="border border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-[var(--ink)]">
            op 02
          </span>
          <span className="border border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-[var(--ink)]">
            op 03
          </span>
        </div>
      </div>

      {/* Lower vertical connector */}
      <div className="mx-auto h-6 w-px bg-[var(--line)]" />

      {/* Converged Document Node */}
      <div className="mx-auto max-w-sm border border-[var(--accent)] bg-[var(--surface)] p-5 text-center shadow-[0_2px_12px_rgba(255,75,43,0.08)]">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--accent)] font-semibold">
          RGA / CRDT
        </span>
        <h4 className="mt-1.5 font-display text-2xl sm:text-3xl font-normal text-[var(--ink)]">
          Converged document
        </h4>
        <div className="mt-3 inline-flex items-center justify-center border border-[var(--line)] bg-[var(--paper)]/60 px-4 py-1.5 font-mono text-sm tracking-[0.25em] text-[var(--ink)] font-semibold">
          A · B · C
        </div>
      </div>
    </figure>
  );
}
