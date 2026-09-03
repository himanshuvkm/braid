import React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-12 sm:p-16 bg-[#ffffff] border border-[#e8e6e1] rounded-2xl text-center shadow-card animate-fade-in ${className}`}
    >
      {icon && (
        <div className="w-11 h-11 rounded-xl bg-[#f4f3ef] border border-[#e8e6e1] flex items-center justify-center text-[#64635e] mb-4">
          {icon}
        </div>
      )}

      <h3 className="text-base font-bold text-[#191919] tracking-tight">
        {title}
      </h3>

      {description && (
        <p className="text-xs text-[#64635e] max-w-sm mt-1.5 leading-relaxed">
          {description}
        </p>
      )}

      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};
