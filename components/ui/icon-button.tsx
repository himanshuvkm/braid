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
    'bg-transparent text-[#64635e] border border-transparent hover:text-[#191919] hover:bg-[#eeede8]/70 active:bg-[#eeede8]',
  secondary:
    'bg-[#ffffff] text-[#191919] border border-[#e8e6e1] hover:border-[#d4d2cc] hover:bg-[#f4f3ef] active:bg-[#eeede8] shadow-xs',
  outline:
    'bg-transparent text-[#64635e] border border-[#e8e6e1] hover:border-[#191919] hover:text-[#191919] hover:bg-[#ffffff]',
  danger:
    'bg-transparent text-red-600 border border-transparent hover:bg-red-50 active:bg-red-100',
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
