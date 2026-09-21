'use client';

import React, { useEffect, useId } from 'react';
import { Icons } from './icons';
import { IconButton } from './icon-button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnBackdrop?: boolean;
}

const maxWidthStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
  closeOnBackdrop = true,
}) => {
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Prevent body scrolling while modal is active
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descId : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={closeOnBackdrop ? onClose : undefined}
      />

      {/* Modal Dialog Panel */}
      <div
        className={`relative w-full ${maxWidthStyles[maxWidth]} bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 sm:p-7 shadow-modal flex flex-col gap-4 z-10 animate-scale-up text-[var(--text)] transition-colors max-h-[92vh] overflow-y-auto`}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1 text-left">
              {title && (
                <h3 id={titleId} className="text-base font-bold tracking-tight text-[var(--text)]">
                  {title}
                </h3>
              )}
              {description && (
                <p id={descId} className="text-xs text-[var(--text-muted)] leading-relaxed">
                  {description}
                </p>
              )}
            </div>

            <IconButton
              aria-label="Close dialog"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-[var(--text-subtle)] hover:text-[var(--text)] -mt-1 -mr-1 shrink-0"
            >
              <Icons.X size={15} />
            </IconButton>
          </div>
        )}

        {children}
      </div>
    </div>
  );
};
