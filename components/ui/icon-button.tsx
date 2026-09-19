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
    'bg-transparent text-neutral-400 border border-transparent hover:text-neutral-100 hover:bg-neutral-800/80 active:bg-neutral-800',
  secondary:
    'bg-neutral-900 text-neutral-200 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800 active:bg-neutral-800 shadow-xs',
  outline:
    'bg-transparent text-neutral-400 border border-neutral-800 hover:border-neutral-600 hover:text-neutral-200 hover:bg-neutral-900',
  danger:
    'bg-transparent text-rose-400 border border-transparent hover:bg-rose-950/40 hover:text-rose-300 active:bg-rose-950/60',
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
        className={`inline-flex items-center justify-center shrink-0 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#191919]/25 focus-visible:ring-offset-1 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.96] ${
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
