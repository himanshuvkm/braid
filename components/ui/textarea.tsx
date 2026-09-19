import React, { forwardRef, useId } from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      hint,
      id: explicitId,
      disabled,
      className = '',
      rows = 3,
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

        <textarea
          ref={ref}
          id={id}
          rows={rows}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={`w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 text-neutral-100 placeholder-neutral-500 border transition-all duration-150 outline-none focus:bg-neutral-900/80 text-sm resize-y ${
            error
              ? 'border-red-500/80 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
              : 'border-neutral-800 focus:border-neutral-600 focus:ring-2 focus:ring-neutral-700/30'
          } ${disabled ? 'opacity-50 cursor-not-allowed bg-neutral-900' : ''} ${className}`}
          {...props}
        />

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

Textarea.displayName = 'Textarea';
