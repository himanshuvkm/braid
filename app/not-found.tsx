import Link from 'next/link';
import { Icons } from '../components/ui/icons';
import { TechnicalLabel } from '../components/design';

export default function NotFound() {
  return <main className="editorial-grid flex min-h-screen flex-col items-center justify-center bg-[var(--paper)] px-5 text-center text-[var(--ink)]">
    <div className="w-full max-w-xl border-y border-[var(--line)] py-10">
      <TechnicalLabel className="text-[var(--accent)]">BRAID / ROUTE NOT FOUND</TechnicalLabel>
      <div className="mt-5 font-mono text-5xl text-[var(--accent)]">404</div>
      <h1 className="mt-4 font-display text-4xl uppercase tracking-tight">Document not found</h1>
      <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-[var(--muted)]">The requested page could not be located.</p>
      <Link href="/" className="mt-8 inline-flex h-11 items-center gap-3 bg-[var(--accent)] px-5 font-mono text-[10px] uppercase tracking-wider text-white hover:bg-[var(--accent-hover)]"><Icons.ArrowLeft size={13} /> Return to Braid</Link>
    </div>
  </main>;
}
