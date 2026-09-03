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
          <label htmlFor={id} className="text-xs font-semibold text-[#191919] select-none">
            {label}
          </label>
        )}

        <div className="relative flex items-center w-full">
          {leftIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-[#9a9994]">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={id}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : hint ? hintId : undefined}
            className={`w-full rounded-xl bg-[#faf9f6] text-[#191919] placeholder-[#9a9994] border transition-all duration-150 outline-none focus:bg-[#ffffff] ${
              error
                ? 'border-red-400 focus:border-red-600 focus:ring-2 focus:ring-red-500/20'
                : 'border-[#e8e6e1] focus:border-[#191919] focus:ring-2 focus:ring-[#191919]/10'
            } ${
              inputSize === 'sm'
                ? 'py-1.5 text-xs h-8'
                : 'py-2.5 text-sm h-10'
            } ${leftIcon ? 'pl-9' : 'px-3.5'} ${rightElement ? 'pr-10' : 'pr-3.5'} ${
              disabled ? 'opacity-50 cursor-not-allowed bg-[#f4f3ef]' : ''
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
          <p id={errorId} className="text-xs font-medium text-red-600 animate-fade-in">
            {error}
          </p>
        )}

        {!error && hint && (
          <p id={hintId} className="text-[11px] text-[#9a9994]">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
