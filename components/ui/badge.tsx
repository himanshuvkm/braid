import React from 'react';

export type BadgeVariant = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'outline' | 'blue';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  neutral: 'bg-transparent text-[var(--muted)] border-[var(--line)]',
  accent: 'bg-[var(--accent-subtle)] text-[var(--accent)] border-[var(--accent)]',
  blue: 'bg-transparent text-[var(--muted)] border-[var(--line)]',
  success: 'bg-transparent text-[var(--muted)] border-[var(--line)]',
  warning: 'bg-transparent text-[var(--muted)] border-[var(--line)]',
  danger: 'bg-transparent text-[var(--accent)] border-[var(--accent)]',
  outline: 'bg-transparent text-[var(--muted)] border-[var(--line)]',
};

const dotColors: Record<BadgeVariant, string> = {
  neutral: 'bg-[var(--muted)]',
  accent: 'bg-[#d95338] editorial-accent-dot',
  blue: 'bg-[var(--muted)]',
  success: 'bg-[var(--muted)]',
  warning: 'bg-[var(--accent)]',
  danger: 'bg-[var(--accent)]',
  outline: 'bg-[var(--muted)]',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'sm',
  dot = false,
  className = '',
  children,
  ...props
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-medium border uppercase tracking-wider select-none ${
        variantStyles[variant]
      } ${
        size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
      } ${className}`}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant]}`} />}
      {children}
    </span>
  );
};
