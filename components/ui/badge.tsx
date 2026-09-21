import React from 'react';

export type BadgeVariant = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'outline' | 'blue';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  neutral: 'bg-[var(--surface-muted)] text-[var(--text)] border-[var(--border)]',
  accent: 'bg-[var(--accent-subtle)] text-[var(--accent)] border-[var(--accent)]/40',
  blue: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  success: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  warning: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  danger: 'bg-red-500/10 text-red-500 border-red-500/30',
  outline: 'bg-transparent text-[var(--text-muted)] border-[var(--border)]',
};

const dotColors: Record<BadgeVariant, string> = {
  neutral: 'bg-[#64635e]',
  accent: 'bg-[#d95338]',
  blue: 'bg-blue-600',
  success: 'bg-emerald-600',
  warning: 'bg-amber-600',
  danger: 'bg-red-600',
  outline: 'bg-[#64635e]',
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
      className={`inline-flex items-center gap-1.5 font-semibold border uppercase tracking-wider rounded-full select-none ${
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
