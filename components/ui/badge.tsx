import React from 'react';

export type BadgeVariant = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'outline' | 'blue';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  neutral: 'bg-neutral-800 text-neutral-200 border-neutral-700',
  accent: 'bg-[#271916] text-[#d95338] border-[#d95338]/40',
  blue: 'bg-blue-950/60 text-blue-300 border-blue-800',
  success: 'bg-emerald-950/60 text-emerald-300 border-emerald-800',
  warning: 'bg-amber-950/60 text-amber-300 border-amber-800',
  danger: 'bg-red-950/60 text-red-400 border-red-800',
  outline: 'bg-transparent text-neutral-400 border-neutral-700',
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
