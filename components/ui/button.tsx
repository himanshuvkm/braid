import React, { forwardRef } from 'react';
import { Icons } from './icons';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-[#191919] editorial-primary text-white border border-[var(--accent)] hover:bg-[var(--accent-hover)] hover:border-[var(--accent-hover)] active:brightness-95 shadow-xs',
  secondary:
    'bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] active:brightness-95 shadow-xs',
  outline:
    'bg-transparent text-[var(--text)] border border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)] active:bg-[var(--surface-hover)]',
  ghost:
    'bg-transparent text-[var(--text-muted)] border border-transparent hover:text-[var(--text)] hover:bg-[var(--surface-muted)] active:bg-[var(--surface-hover)]',
  danger:
    'bg-[var(--danger)] text-white border border-[var(--danger)] hover:bg-[var(--danger-hover)] active:brightness-95 shadow-xs',
  accent:
    'bg-[var(--accent)] text-white border border-[var(--accent)] hover:bg-[var(--accent-hover)] active:brightness-95 shadow-xs',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-9.5 px-3.5 text-xs font-medium gap-2 rounded-xl',
  lg: 'h-11 px-5 text-sm font-semibold gap-2.5 rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`inline-flex items-center justify-center select-none font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--surface)] disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] ${
          variantStyles[variant]
        } ${sizeStyles[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Icons.Spinner size={size === 'sm' ? 13 : 15} className="shrink-0 animate-spin" />
        ) : (
          leftIcon && <span className="shrink-0 flex items-center">{leftIcon}</span>
        )}
        {children && <span className="truncate">{children}</span>}
        {!isLoading && rightIcon && <span className="shrink-0 flex items-center">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
