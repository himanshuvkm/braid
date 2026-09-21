'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { generateRoomId, setStoredUserName, getStoredUserName } from '../lib/room-storage';
import { Icons } from '../components/ui/icons';
import { AuthCorner } from '../components/layout/AuthCorner';
import { PreviousDocumentsSidebar } from '../components/layout/PreviousDocumentsSidebar';
import { ThemeToggle } from '../components/ui/theme-toggle';

export default function Home() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [isJoinMode, setIsJoinMode] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = getStoredUserName();
    if (stored && stored.trim()) {
      setUserName(stored);
    }
  }, []);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = userName.trim();
    if (!trimmedName) {
      setError('Please enter your name to start');
      return;
    }

    setStoredUserName(trimmedName);

    if (isJoinMode) {
      let rawId = joinCode.trim();
      if (rawId.includes('/doc/')) {
        rawId = rawId.split('/doc/')[1].split('?')[0].split('#')[0];
      } else if (rawId.includes('/project/')) {
        rawId = rawId.split('/project/')[1].split('?')[0].split('#')[0];
      } else if (rawId.includes('/')) {
        const parts = rawId.split('/');
        rawId = parts[parts.length - 1].split('?')[0].split('#')[0];
      }

      if (!rawId) {
        setError('Please enter a valid room code or link');
        return;
      }
      router.push(`/${encodeURIComponent(rawId)}`);
    } else {
      const newRoomId = generateRoomId();
      router.push(`/${newRoomId}`);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text)] flex flex-col items-center justify-center p-4 selection:bg-[var(--surface-hover)] selection:text-[var(--text)] relative transition-colors">
      {/* Top Left: Login Detail / Login Button */}
      <AuthCorner />

      {/* Top Right: Theme Toggle */}
      <div className="fixed top-4 right-4 z-30">
        <ThemeToggle />
      </div>

      {/* Bottom Right: Previous Documents Sidebar */}
      <PreviousDocumentsSidebar />

      <div className="w-full max-w-sm flex flex-col items-center gap-8 animate-fade-in">
        {/* Minimal branding */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] flex items-center justify-center text-[var(--text)] shadow-xs">
            <Icons.Logo size={16} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text)]">Braid</h1>
          <p className="text-xs text-[var(--text-muted)]">Minimal real-time collaborative editor</p>
        </div>

        {/* Ultra-minimal direct name prompt */}
        <form onSubmit={handleStart} className="w-full flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <input
              type="text"
              placeholder="Your name..."
              value={userName}
              onChange={(e) => {
                setUserName(e.target.value);
                if (error) setError('');
              }}
              autoFocus
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] text-sm text-[var(--text)] placeholder-[var(--text-subtle)] outline-none focus:border-[var(--border-strong)] focus:bg-[var(--surface)] transition-all shadow-2xs"
            />
          </div>

          {isJoinMode && (
            <div className="flex flex-col gap-1.5">
              <input
                type="text"
                placeholder="Room code or link (e.g. doc-4k9z2a)"
                value={joinCode}
                onChange={(e) => {
                  setJoinCode(e.target.value);
                  if (error) setError('');
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] text-sm font-mono text-[var(--text)] placeholder-[var(--text-subtle)] outline-none focus:border-[var(--border-strong)] focus:bg-[var(--surface)] transition-all shadow-2xs"
              />
            </div>
          )}

          {error && <p className="text-xs text-rose-400 px-1">{error}</p>}

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold transition-all active:scale-[0.99] flex items-center justify-center gap-1.5 cursor-pointer mt-1 shadow-xs"
          >
            <span>{isJoinMode ? 'Join Room' : 'Start Writing'}</span>
            <Icons.ArrowRight size={12} />
          </button>
        </form>

        {/* Minimal Mode Toggle */}
        <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
          <button
            type="button"
            onClick={() => {
              setIsJoinMode(!isJoinMode);
              setError('');
            }}
            className="hover:text-[var(--text)] transition-colors cursor-pointer"
          >
            {isJoinMode ? '← Create a new room' : 'Have a room code? Join room'}
          </button>
        </div>
      </div>
    </div>
  );
}
