import React, { forwardRef, useId } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  inputSize?: 'sm' | 'md';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightElement,
      inputSize = 'md',
      id: explicitId,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = explicitId || generatedId;
    const hintId = `${id}-hint`;
    const errorId = `${id}-error`;

    return (
      <div className="flex flex-col gap-1.5 w-full text-left">
        {label && (
          <label htmlFor={id} className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted)] select-none">
            {label}
          </label>
        )}

        <div className="relative flex items-center w-full">
          {leftIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-[var(--text-subtle)]">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={id}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : hint ? hintId : undefined}
            className={`w-full rounded-none bg-transparent text-[var(--ink)] placeholder-[var(--text-subtle)] border-x-0 border-t-0 border-b transition-all duration-150 outline-none focus:bg-transparent ${
              error
                ? 'border-red-500/80 focus:border-red-500 focus:ring-0'
                : 'border-[var(--line)] focus:border-[var(--accent)] focus:ring-0'
            } ${
              inputSize === 'sm'
                ? 'py-1.5 text-xs h-8'
                : 'py-3 text-sm h-11'
            } ${leftIcon ? 'pl-9' : 'px-3.5'} ${rightElement ? 'pr-10' : 'pr-3.5'} ${
              disabled ? 'opacity-50 cursor-not-allowed bg-[var(--surface-muted)]' : ''
            } ${className}`}
            {...props}
          />

          {rightElement && (
            <div className="absolute right-2 flex items-center">
              {rightElement}
            </div>
          )}
        </div>

        {error && (
          <p id={errorId} className="text-xs font-medium text-red-400 animate-fade-in">
            {error}
          </p>
        )}

        {!error && hint && (
          <p id={hintId} className="text-[11px] text-[var(--text-subtle)]">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
