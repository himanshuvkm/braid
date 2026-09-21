'use client';

import React from 'react';
import { useTheme } from './theme-provider';
import { Icons } from './icons';
import { Tooltip } from './tooltip';

interface ThemeToggleProps {
  className?: string;
  variant?: 'icon' | 'segmented';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  variant = 'icon',
}) => {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  if (variant === 'segmented') {
    return (
      <div className={`inline-flex items-center p-0.5 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] ${className}`}>
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all ${
            theme === 'light'
              ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs font-semibold'
              : 'text-[var(--text-subtle)] hover:text-[var(--text)]'
          }`}
          title="Light Theme"
        >
          <Icons.Sun size={13} />
          <span>Light</span>
        </button>
        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all ${
            theme === 'dark'
              ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs font-semibold'
              : 'text-[var(--text-subtle)] hover:text-[var(--text)]'
          }`}
          title="Dark Theme"
        >
          <Icons.Moon size={13} />
          <span>Dark</span>
        </button>
        <button
          type="button"
          onClick={() => setTheme('system')}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all ${
            theme === 'system'
              ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs font-semibold'
              : 'text-[var(--text-subtle)] hover:text-[var(--text)]'
          }`}
          title="System Theme"
        >
          <Icons.Monitor size={13} />
          <span>Auto</span>
        </button>
      </div>
    );
  }

  return (
    <Tooltip content={`Theme: ${theme === 'system' ? 'System' : resolvedTheme === 'dark' ? 'Dark' : 'Light'} (Click to switch)`} position="bottom">
      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Toggle color theme"
        className={`relative w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] active:scale-95 transition-all ${className}`}
      >
        <span className="sr-only">Toggle theme</span>
        <div className="relative w-4 h-4 flex items-center justify-center overflow-hidden">
          <Icons.Sun
            size={15}
            className={`absolute transition-all duration-300 transform ${
              resolvedTheme === 'dark'
                ? 'rotate-90 scale-0 opacity-0'
                : 'rotate-0 scale-100 opacity-100 text-amber-500'
            }`}
          />
          <Icons.Moon
            size={15}
            className={`absolute transition-all duration-300 transform ${
              resolvedTheme === 'dark'
                ? 'rotate-0 scale-100 opacity-100 text-neutral-200'
                : '-rotate-90 scale-0 opacity-0'
            }`}
          />
        </div>
      </button>
    </Tooltip>
  );
};
