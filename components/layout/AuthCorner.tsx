'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icons } from '../ui/icons';
import { Avatar } from '../ui/avatar';
import type { User } from '../../lib/db';

interface AuthCornerProps {
  initialUser?: User | null;
  className?: string;
  onLogoutSuccess?: () => void;
}

export function AuthCorner({ initialUser, className = '', onLogoutSuccess }: AuthCornerProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(initialUser || null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user || null);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      onLogoutSuccess?.();
      router.refresh();
    } catch {
      setUser(null);
    } finally {
      setIsLoggingOut(false);
    }
  };



  return (
    <div className={`fixed top-4 left-4 z-30 flex items-center gap-2 ${className}`}>
      {user ? (
        /* Logged In View */
        <div className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl bg-[var(--surface)]/90 backdrop-blur-md border border-[var(--border)] shadow-xs animate-fade-in text-xs">
          <Avatar name={user.name} size="xs" />
          <span className="font-semibold text-[var(--text)] truncate max-w-[120px]">
            {user.name}
          </span>

          <span className="text-[var(--border)]">|</span>

          <Link
            href="/dashboard"
            className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            title="Open Workspace Dashboard"
          >
            Dashboard
          </Link>

          <span className="text-[var(--border)]">|</span>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            title="Log out"
            className="flex items-center gap-1 text-[11px] font-medium text-[var(--text-muted)] hover:text-rose-400 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isLoggingOut ? (
              <Icons.Spinner size={11} className="animate-spin" />
            ) : (
              <Icons.LogOut size={11} />
            )}
            <span>Log out</span>
          </button>
        </div>
      ) : (
        /* Not Logged In View */
        <Link
          href="/login"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface)]/90 hover:bg-[var(--surface-hover)] backdrop-blur-md border border-[var(--border)] hover:border-[var(--border-strong)] text-[var(--text)] text-xs font-semibold shadow-xs transition-all active:scale-[0.98] animate-fade-in"
        >
          <Icons.User size={13} className="text-[var(--text-subtle)]" />
          <span>Log In</span>
        </Link>
      )}
    </div>
  );
}
