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
      className={`flex flex-col items-center justify-center p-12 sm:p-16 bg-neutral-900 border border-neutral-800 rounded-2xl text-center shadow-card animate-fade-in ${className}`}
    >
      {icon && (
        <div className="w-11 h-11 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center text-neutral-400 mb-4">
          {icon}
        </div>
      )}

      <h3 className="text-base font-bold text-neutral-100 tracking-tight">
        {title}
      </h3>

      {description && (
        <p className="text-xs text-neutral-400 max-w-sm mt-1.5 leading-relaxed">
          {description}
        </p>
      )}

      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};
