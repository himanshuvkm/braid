import React, { forwardRef, useId } from 'react';
import { Icons } from './icons';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      hint,
      id: explicitId,
      disabled,
      className = '',
      children,
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
          <label htmlFor={id} className="text-xs font-semibold text-[var(--text)] select-none">
            {label}
          </label>
        )}

        <div className="relative flex items-center w-full">
          <select
            ref={ref}
            id={id}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : hint ? hintId : undefined}
            className={`w-full appearance-none pl-3.5 pr-8 py-2 rounded-xl bg-[var(--surface-muted)] text-[var(--text)] border transition-all duration-150 outline-none text-xs font-semibold focus:bg-[var(--surface)] cursor-pointer ${
              error
                ? 'border-red-500/80 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                : 'border-[var(--border)] focus:border-[var(--border-strong)] focus:ring-2 focus:ring-[var(--accent)]/20'
            } ${disabled ? 'opacity-50 cursor-not-allowed bg-[var(--surface-muted)]' : ''} ${className}`}
            {...props}
          >
            {children}
          </select>

          <div className="absolute right-2.5 pointer-events-none text-[var(--text-subtle)] flex items-center">
            <Icons.ChevronDown size={14} />
          </div>
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

Select.displayName = 'Select';
