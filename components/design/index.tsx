import React from 'react';
import { Button, type ButtonProps } from '../ui/button';

export function EditorialGrid({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`editorial-grid ${className}`}>{children}</div>;
}

export function SectionNumber({ number, label, className = '' }: { number: string; label?: string; className?: string }) {
  return <div className={`flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)] ${className}`}>
    <span className="text-[var(--accent)]">{number.padStart(2, '0')}</span>
    {label && <span>{label}</span>}
  </div>;
}

export function TechnicalLabel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)] ${className}`}>{children}</span>;
}

export function EditorialHeading({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`font-display text-4xl font-normal leading-[0.98] tracking-[-0.045em] sm:text-5xl lg:text-6xl ${className}`}>{children}</h2>;
}

export function TechnicalDivider({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`technical-divider ${className}`} />;
}

export function EditorialButton({ children, className = '', ...props }: ButtonProps) {
  return <Button {...props} className={`!h-11 !rounded-none !px-5 !text-[11px] !font-mono !uppercase !tracking-[0.1em] ${className}`}>{children}</Button>;
}

export function EditorialIconButton({ label, children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button {...props} aria-label={label} title={label} className={`inline-flex h-9 w-9 items-center justify-center border border-[var(--line)] text-[var(--ink)] transition-colors hover:border-[var(--ink)] hover:bg-[var(--surface-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${className}`}>{children}</button>;
}

export function MetadataRow({ items, className = '' }: { items: Array<{ label: string; value: React.ReactNode }>; className?: string }) {
  return <div className={`flex flex-wrap gap-x-5 gap-y-2 ${className}`}>{items.map((item) => <div key={item.label} className="flex items-baseline gap-2"><TechnicalLabel>{item.label}</TechnicalLabel><span className="font-mono text-xs text-[var(--ink)]">{item.value}</span></div>)}</div>;
}

export function TechnicalStat({ value, label, className = '' }: { value: React.ReactNode; label: string; className?: string }) {
  return <div className={`border-l border-[var(--line)] pl-4 ${className}`}><div className="font-display text-4xl leading-none tracking-tight sm:text-5xl">{value}</div><TechnicalLabel className="mt-2 block">{label}</TechnicalLabel></div>;
}

export function DiagramFrame({ children, label, className = '' }: { children: React.ReactNode; label: string; className?: string }) {
  return <figure className={`relative border border-[var(--line)] bg-[var(--surface)] ${className}`}>
    <figcaption className="flex items-center justify-between border-b border-[var(--line)] px-3 py-2"><TechnicalLabel>{label}</TechnicalLabel><span aria-hidden="true" className="h-2 w-2 rounded-full bg-[var(--accent)]" /></figcaption>
    <div className="p-4 sm:p-6">{children}</div>
  </figure>;
}

export function AccentMarker({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`inline-block h-2 w-2 rounded-full bg-[var(--accent)] ${className}`} />;
}

export function BlueprintCanvas({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`blueprint-canvas ${className}`}>{children}</div>;
}
