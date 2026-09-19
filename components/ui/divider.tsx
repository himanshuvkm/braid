import React from 'react';

export interface DividerProps {
  label?: string;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export const Divider: React.FC<DividerProps> = ({
  label,
  orientation = 'horizontal',
  className = '',
}) => {
  if (orientation === 'vertical') {
    return <div className={`w-[1px] bg-neutral-800 self-stretch ${className}`} />;
  }

  if (label) {
    return (
      <div className={`flex items-center gap-3 w-full my-2 ${className}`}>
        <div className="flex-1 h-[1px] bg-neutral-800" />
        <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider select-none">
          {label}
        </span>
        <div className="flex-1 h-[1px] bg-neutral-800" />
      </div>
    );
  }

  return <div className={`w-full h-[1px] bg-neutral-800 my-1 ${className}`} />;
};
