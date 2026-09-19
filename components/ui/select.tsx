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
          <label htmlFor={id} className="text-xs font-semibold text-neutral-300 select-none">
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
            className={`w-full appearance-none pl-3.5 pr-8 py-2 rounded-xl bg-neutral-950 text-neutral-100 border transition-all duration-150 outline-none text-xs font-semibold focus:bg-neutral-900/80 cursor-pointer ${
              error
                ? 'border-red-500/80 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                : 'border-neutral-800 focus:border-neutral-600 focus:ring-2 focus:ring-neutral-700/30'
            } ${disabled ? 'opacity-50 cursor-not-allowed bg-neutral-900' : ''} ${className}`}
            {...props}
          >
            {children}
          </select>

          <div className="absolute right-2.5 pointer-events-none text-neutral-500 flex items-center">
            <Icons.ChevronDown size={14} />
          </div>
        </div>

        {error && (
          <p id={errorId} className="text-xs font-medium text-red-400 animate-fade-in">
            {error}
          </p>
        )}

        {!error && hint && (
          <p id={hintId} className="text-[11px] text-neutral-500">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
