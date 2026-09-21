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
      className={`flex flex-col items-center justify-center p-12 sm:p-16 bg-[var(--surface)] border border-[var(--border)] rounded-2xl text-center shadow-card animate-fade-in transition-colors ${className}`}
    >
      {icon && (
        <div className="w-11 h-11 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] flex items-center justify-center text-[var(--text-subtle)] mb-4 shadow-xs">
          {icon}
        </div>
      )}

      <h3 className="text-base font-bold text-[var(--text)] tracking-tight">
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
