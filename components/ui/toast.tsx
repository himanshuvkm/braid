'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Icons } from './icons';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface Toast {
  id: string;
  message: string;
  type?: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast Render Overlay */}
      <div
        role="region"
        aria-live="polite"
        aria-label="Notifications"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 pointer-events-none max-w-sm w-full px-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border shadow-modal text-xs font-medium animate-slide-down backdrop-blur-md transition-all ${
              t.type === 'error'
                ? 'bg-red-50/95 border-red-200 text-red-900'
                : t.type === 'warning'
                ? 'bg-amber-50/95 border-amber-200 text-amber-900'
                : t.type === 'info'
                ? 'bg-[#ffffff]/95 border-[#e8e6e1] text-[#191919]'
                : 'bg-[#191919]/95 border-[#191919] text-[#ffffff]'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {t.type === 'error' ? (
                <Icons.AlertCircle size={14} className="text-red-600 shrink-0" />
              ) : t.type === 'warning' ? (
                <Icons.AlertTriangle size={14} className="text-amber-600 shrink-0" />
              ) : t.type === 'info' ? (
                <Icons.Info size={14} className="text-neutral-500 shrink-0" />
              ) : (
                <Icons.Check size={14} className="text-emerald-400 shrink-0" />
              )}
              <span className="truncate">{t.message}</span>
            </div>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => removeToast(t.id)}
              className="p-1 opacity-60 hover:opacity-100 transition-opacity shrink-0 rounded hover:bg-black/5"
            >
              <Icons.X size={12} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return { toast: () => {} };
  }
  return ctx;
}
