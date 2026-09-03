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
    'bg-[#191919] text-[#ffffff] border border-[#191919] hover:bg-[#2e2e2e] active:bg-[#000000] shadow-xs',
  secondary:
    'bg-[#ffffff] text-[#191919] border border-[#e8e6e1] hover:border-[#d4d2cc] hover:bg-[#f4f3ef] active:bg-[#eeede8] shadow-xs',
  outline:
    'bg-transparent text-[#191919] border border-[#e8e6e1] hover:border-[#191919] hover:bg-[#ffffff] active:bg-[#f4f3ef]',
  ghost:
    'bg-transparent text-[#64635e] border border-transparent hover:text-[#191919] hover:bg-[#eeede8]/70 active:bg-[#eeede8]',
  danger:
    'bg-red-600 text-[#ffffff] border border-red-600 hover:bg-red-700 active:bg-red-800 shadow-xs',
  accent:
    'bg-[#d95338] text-[#ffffff] border border-[#d95338] hover:bg-[#c24229] active:bg-[#a9341e] shadow-xs',
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
        className={`inline-flex items-center justify-center select-none font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#191919]/25 focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] ${
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
