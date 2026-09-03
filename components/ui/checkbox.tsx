import React, { forwardRef, useId } from 'react';
import { Icons } from './icons';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, id: explicitId, checked, disabled, className = '', onChange, ...props }, ref) => {
    const generatedId = useId();
    const id = explicitId || generatedId;

    return (
      <label
        htmlFor={id}
        className={`inline-flex items-start gap-2.5 select-none cursor-pointer group ${
          disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
        } ${className}`}
      >
        <div className="relative flex items-center justify-center mt-0.5 shrink-0">
          <input
            ref={ref}
            id={id}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={onChange}
            className="peer sr-only"
            {...props}
          />
          <div
            className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center transition-all duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-[#191919]/25 peer-focus-visible:ring-offset-1 ${
              checked
                ? 'bg-[#191919] border-[#191919] text-[#ffffff]'
                : 'bg-[#faf9f6] border-[#e8e6e1] group-hover:border-[#191919]'
            }`}
          >
            {checked && <Icons.Check size={11} className="stroke-[3]" />}
          </div>
        </div>

        {(label || description) && (
          <div className="flex flex-col text-left leading-tight">
            {label && (
              <span className={`text-xs font-semibold text-[#191919] ${checked ? 'text-black' : ''}`}>
                {label}
              </span>
            )}
            {description && <span className="text-[11px] text-[#9a9994] mt-0.5">{description}</span>}
          </div>
        )}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';
