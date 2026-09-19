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
        <div className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl bg-neutral-900/90 backdrop-blur-md border border-neutral-800 shadow-sm animate-fade-in text-xs">
          <Avatar name={user.name} size="xs" />
          <span className="font-semibold text-neutral-200 truncate max-w-[120px]">
            {user.name}
          </span>

          <span className="text-neutral-700">|</span>

          <Link
            href="/dashboard"
            className="text-[11px] text-neutral-400 hover:text-neutral-200 transition-colors"
            title="Open Workspace Dashboard"
          >
            Dashboard
          </Link>

          <span className="text-neutral-700">|</span>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            title="Log out"
            className="flex items-center gap-1 text-[11px] font-medium text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer disabled:opacity-50"
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
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 backdrop-blur-md border border-neutral-800 hover:border-neutral-700 text-neutral-200 hover:text-white text-xs font-semibold shadow-sm transition-all active:scale-[0.98] animate-fade-in"
        >
          <Icons.User size={13} className="text-neutral-400" />
          <span>Log In</span>
        </Link>
      )}
    </div>
  );
}
