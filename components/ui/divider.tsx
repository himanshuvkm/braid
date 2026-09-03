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
    return <div className={`w-[1px] bg-[#e8e6e1] self-stretch ${className}`} />;
  }

  if (label) {
    return (
      <div className={`flex items-center gap-3 w-full my-2 ${className}`}>
        <div className="flex-1 h-[1px] bg-[#e8e6e1]" />
        <span className="text-[10px] font-semibold text-[#9a9994] uppercase tracking-wider select-none">
          {label}
        </span>
        <div className="flex-1 h-[1px] bg-[#e8e6e1]" />
      </div>
    );
  }

  return <div className={`w-full h-[1px] bg-[#e8e6e1] my-1 ${className}`} />;
};
