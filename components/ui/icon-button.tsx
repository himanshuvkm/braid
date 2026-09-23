import React, { forwardRef } from 'react';

export type IconButtonVariant = 'ghost' | 'secondary' | 'outline' | 'danger';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  isLoading?: boolean;
}

const variantStyles: Record<IconButtonVariant, string> = {
  ghost:
    'bg-transparent text-[var(--text-muted)] border border-transparent hover:text-[var(--text)] hover:bg-[var(--surface-hover)] active:bg-[var(--surface-muted)]',
  secondary:
    'bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] active:bg-[var(--surface-muted)] shadow-xs',
  outline:
    'bg-transparent text-[var(--text-muted)] border border-[var(--border)] hover:border-[var(--border-strong)] hover:text-[var(--text)] hover:bg-[var(--surface)]',
  danger:
    'bg-transparent text-rose-500 border border-transparent hover:bg-rose-500/10 hover:text-rose-600 active:bg-rose-500/20',
};

const sizeStyles: Record<IconButtonSize, string> = {
  sm: 'w-7 h-7 rounded-lg text-xs',
  md: 'w-8.5 h-8.5 rounded-xl text-sm',
  lg: 'w-10 h-10 rounded-xl text-base',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      variant = 'ghost',
      size = 'md',
      isLoading = false,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center shrink-0 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--surface)] disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98] ${
          variantStyles[variant]
        } ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
