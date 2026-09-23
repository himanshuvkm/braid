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
      className={`flex flex-col items-center justify-center border-y border-[var(--line)] bg-transparent p-12 text-center transition-colors sm:p-16 ${className}`}
    >
      {icon && (
        <div className="mb-4 flex h-11 w-11 items-center justify-center border border-[var(--line)] text-[var(--muted)]">
          {icon}
        </div>
      )}

      <h3 className="font-display text-2xl text-[var(--ink)] tracking-tight">
        {title}
      </h3>

      {description && (
        <p className="text-xs text-[var(--text-muted)] max-w-sm mt-1.5 leading-relaxed">
          {description}
        </p>
      )}

      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};
