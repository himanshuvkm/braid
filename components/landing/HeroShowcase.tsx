import React from 'react';
import { Icons } from '../ui/icons';
import { AccentMarker, DiagramFrame, EditorialHeading, MetadataRow, SectionNumber, TechnicalLabel, TechnicalStat } from '../design';

const capabilities = [
  ['CONFLICT-FREE SYNC', 'Concurrent edits converge through the custom RGA CRDT.'],
  ['LIVE PRESENCE', 'See the collaborators currently working in a room.'],
  ['DOCUMENT EXPORT', 'Carry structured documents into PDF and Word.'],
  ['BUILT FOR DEVELOPERS', 'Move between plain text and a focused code mode.'],
];

export function HeroShowcase() {
  return <div className="mt-24 flex w-full flex-col gap-24 sm:gap-32">
    <section id="product" className="scroll-mt-24 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
      <div className="lg:col-span-4">
        <SectionNumber number="02" label="The workspace" />
        <EditorialHeading className="mt-6">Your ideas.<br /><em className="font-normal text-[var(--accent)]">In real time.</em></EditorialHeading>
        <p className="mt-5 max-w-sm text-sm leading-7 text-[var(--muted)]">A shared writing surface for technical work, with live synchronization, structured blocks, and a dedicated code mode.</p>
        <div className="mt-8 space-y-0">
          {capabilities.map(([label, description], i) => <div key={label} className="grid grid-cols-[2.25rem_1fr] gap-3 border-t border-[var(--line)] py-3.5">
            <span className="font-mono text-[10px] text-[var(--accent)]">0{i + 1}</span>
            <div><TechnicalLabel className="text-[var(--ink)]">{label}</TechnicalLabel><p className="mt-1 text-xs leading-5 text-[var(--muted)]">{description}</p></div>
          </div>)}
        </div>
      </div>
      <div className="lg:col-span-8">
        <DiagramFrame label="BRAID / DOCUMENT PREVIEW" className="shadow-[var(--shadow-card)]">
          <div className="grid min-h-[320px] grid-cols-[2.5rem_1fr] sm:grid-cols-[3.25rem_1fr]">
            <aside className="border-r border-[var(--line)] pr-3 text-right font-mono text-[9px] leading-7 text-[var(--text-subtle)]">01<br />02<br />03<br />04<br />05<br />06<br />07<br />08<br />09<br />10</aside>
            <div className="min-w-0 pl-4 sm:pl-7">
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-3"><TechnicalLabel>RFC / DISTRIBUTED SYNC</TechnicalLabel><span className="flex items-center gap-2 font-mono text-[9px] text-[var(--muted)]"><AccentMarker />SYNCED</span></div>
              <h3 className="mt-7 font-display text-3xl tracking-tight sm:text-4xl">A shared document.</h3>
              <p className="mt-3 max-w-lg text-sm leading-6 text-[var(--muted)]">Write together without waiting for a lock. Braid merges concurrent character operations and keeps each connected editor in sync.</p>
              <div className="mt-7 border-l-2 border-[var(--accent)] py-1 pl-4 text-sm leading-6">Changes are applied locally, then synchronized with collaborators in the room.</div>
              <div className="mt-8 overflow-hidden border border-[#343434] bg-[#171717] text-[#ece8dc]">
                <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 font-mono text-[9px] text-white/55"><span>crdt / operation.ts</span><span>TypeScript</span></div>
                <pre className="overflow-x-auto p-4 font-mono text-[10px] leading-6 sm:text-xs"><code><span className="text-[#ff805e]">const</span> operation = {'{'}<br />{'  '}type: <span className="text-[#b9c8a8]">&apos;insert&apos;</span>,<br />{'  '}siteId: <span className="text-[#b9c8a8]">&apos;site-a1c2&apos;</span>,<br />{'  '}clock: <span className="text-[#f1c77a]">42</span>,<br />{'  '}value: <span className="text-[#b9c8a8]">&apos;hello&apos;</span><br />{'}'};</code></pre>
              </div>
              <MetadataRow className="mt-5" items={[{ label: 'MODE', value: 'TEXT' }, { label: 'SYNC', value: 'LIVE' }, { label: 'FORMAT', value: 'RGA' }]} />
            </div>
          </div>
        </DiagramFrame>
      </div>
    </section>

    <section id="architecture" className="scroll-mt-24 border-y border-[var(--line)] py-8 sm:py-12">
      <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-4"><SectionNumber number="03" label="Architecture" /><EditorialHeading className="mt-6">Built on<br /><em>CRDTs.</em></EditorialHeading><p className="mt-5 max-w-sm text-sm leading-7 text-[var(--muted)]">Braid uses a custom Replicated Growable Array, Lamport timestamps, and causal buffering to converge edits across connected peers.</p></div>
        <div className="lg:col-span-8">
          <DiagramFrame label="CONCURRENT OPERATIONS / CONVERGENCE" className="blueprint-canvas">
            <div className="grid grid-cols-3 gap-2 sm:gap-5">
              {['USER A', 'USER B', 'USER C'].map((user, i) => <div key={user} className="border border-[var(--line)] bg-[var(--surface)] p-3 text-center sm:p-4"><TechnicalLabel>{user}</TechnicalLabel><div className="mt-3 font-mono text-[10px] text-[var(--muted)]">insert({['A', 'B', 'C'][i]})</div><div className="mx-auto mt-3 h-4 w-px bg-[var(--accent)]" /><AccentMarker className="mx-auto" /></div>)}
            </div>
            <div className="mx-auto h-7 w-px bg-[var(--line)]" />
            <div className="border-y border-[var(--line)] py-3 text-center"><TechnicalLabel>CONCURRENT OPERATIONS</TechnicalLabel><div className="mt-3 flex justify-center gap-2 font-mono text-xs"><span className="border border-[var(--line)] bg-[var(--surface)] px-3 py-1">op 01</span><span className="border border-[var(--line)] bg-[var(--surface)] px-3 py-1">op 02</span><span className="border border-[var(--line)] bg-[var(--surface)] px-3 py-1">op 03</span></div></div>
            <div className="mx-auto h-7 w-px bg-[var(--line)]" />
            <div className="mx-auto max-w-sm border border-[var(--accent)] bg-[var(--surface)] px-5 py-4 text-center"><TechnicalLabel className="text-[var(--accent)]">RGA / CRDT</TechnicalLabel><div className="mt-2 font-display text-2xl">Converged document</div><div className="mt-3 font-mono text-xs tracking-[0.2em] text-[var(--muted)]">A · B · C</div></div>
          </DiagramFrame>
        </div>
      </div>
    </section>

    <section className="grid gap-8 lg:grid-cols-12 lg:gap-10">
      <div className="lg:col-span-4"><SectionNumber number="04" label="Capabilities" /><EditorialHeading className="mt-6">More than<br />a text editor.</EditorialHeading></div>
      <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 lg:col-span-8">
        {[
          ['01', 'RICH TEXT BLOCKS', 'Headings, lists, quotes, callouts, and more.'],
          ['02', '12+ CODE LANGUAGES', 'A code mode with language selection and line numbers.'],
          ['03', 'REAL-TIME PRESENCE', 'See who is connected to your document.'],
          ['04', 'PDF / DOCX', 'Export polished documents for sharing.'],
        ].map(([number, title, detail]) => <div key={number} className="grid grid-cols-[2.5rem_1fr] gap-3 border-t border-[var(--line)] py-5 sm:px-4"><span className="font-mono text-[10px] text-[var(--accent)]">{number}</span><div><TechnicalLabel className="text-[var(--ink)]">{title}</TechnicalLabel><p className="mt-2 max-w-xs text-xs leading-5 text-[var(--muted)]">{detail}</p></div></div>)}
      </div>
    </section>

    <section className="border-y border-[var(--line)] py-8 sm:py-12">
      <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-4"><SectionNumber number="05" label="A focused workflow" /><EditorialHeading className="mt-6">Designed for<br /><em>how you work.</em></EditorialHeading></div>
        <div className="grid gap-0 sm:grid-cols-2 lg:col-span-8">
          {[
            [<Icons.List key="outline" size={17} />, 'DOCUMENT OUTLINE', 'Navigate document structure at a glance.'],
            [<Icons.Code key="code" size={17} />, 'MULTI-LANGUAGE SYNTAX', 'Switch from prose to a dedicated code surface.'],
            [<Icons.Users key="collab" size={17} />, 'TEAM COLLABORATION', 'Share a room and work alongside connected peers.'],
            [<Icons.FileText key="export" size={17} />, 'DOCUMENT EXPORT', 'Take your work with you in PDF or DOCX.'],
          ].map(([icon, title, detail]) => <div key={String(title)} className="flex gap-4 border-t border-[var(--line)] py-5 sm:px-4"><span className="text-[var(--accent)]">{icon}</span><div><TechnicalLabel className="text-[var(--ink)]">{title}</TechnicalLabel><p className="mt-2 text-xs leading-5 text-[var(--muted)]">{detail}</p></div></div>)}
        </div>
      </div>
    </section>

    <section className="grid gap-8 lg:grid-cols-12 lg:gap-10">
      <div className="lg:col-span-4"><SectionNumber number="06" label="Open source by design" /><EditorialHeading className="mt-6">A system built<br />to be understood.</EditorialHeading><p className="mt-5 text-sm leading-7 text-[var(--muted)]">Explore the project, its architecture, and the choices behind the editor.</p><a href="https://github.com/himanshuvkm/braid" target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 border-b border-[var(--accent)] pb-1 font-mono text-[10px] uppercase tracking-wider">VIEW PROJECT <Icons.ArrowRight size={12} className="text-[var(--accent)]" /></a></div>
      <div className="lg:col-span-8"><DiagramFrame label="BRAID / SYSTEM MAP" className="blueprint-canvas"><div className="grid gap-3 sm:grid-cols-3"><div className="border border-[var(--line)] bg-[var(--surface)] p-4"><TechnicalLabel>CLIENTS</TechnicalLabel><p className="mt-3 text-xs">Text editor<br />Code editor<br />Presence</p></div><div className="flex flex-col justify-center text-center"><div className="font-mono text-[10px] text-[var(--accent)]">WEBSOCKET SYNC</div><div className="my-2 h-px bg-[var(--accent)]" /><div className="font-mono text-[10px] text-[var(--muted)]">RGA OPERATIONS</div></div><div className="border border-[var(--line)] bg-[var(--surface)] p-4"><TechnicalLabel>STORAGE</TechnicalLabel><p className="mt-3 text-xs">SQLite<br />PostgreSQL<br />Document state</p></div></div></DiagramFrame></div>
    </section>

    <section className="border-y border-[var(--line)] py-8 sm:py-12">
      <SectionNumber number="07" label="From the project" />
      <div className="mt-8 grid grid-cols-2 gap-y-8 sm:grid-cols-4">
        <TechnicalStat value="<1ms" label="Local insert latency" />
        <TechnicalStat value="12+" label="Code languages" />
        <TechnicalStat value="170+" label="Automated tests" />
        <TechnicalStat value="∞" label="Ways to collaborate" />
      </div>
      <p className="mt-6 font-mono text-[9px] text-[var(--muted)]">Performance and test figures as documented in the project README.</p>
    </section>

    <section className="flex flex-col items-start justify-between gap-7 pb-8 sm:flex-row sm:items-end">
      <div><SectionNumber number="08" label="Start here" /><EditorialHeading className="mt-6">Build together.<br /><em>Without limits.</em></EditorialHeading></div>
      <a href="#open-braid" className="inline-flex h-12 items-center gap-4 bg-[var(--accent)] px-5 font-mono text-[11px] font-semibold uppercase tracking-wider text-white transition-colors hover:bg-[var(--accent-hover)]">OPEN BRAID <Icons.ArrowRight size={14} /></a>
    </section>
  </div>;
}
