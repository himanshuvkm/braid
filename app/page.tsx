'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { generateRoomId, setStoredUserName, getStoredUserName } from '../lib/room-storage';
import { Icons } from '../components/ui/icons';

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
      // Auto-create room immediately for returning users
      const newRoomId = generateRoomId();
      router.push(`/${newRoomId}`);
    }
  }, [router]);

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
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex flex-col items-center justify-center p-4 selection:bg-neutral-800 selection:text-neutral-200">
      <div className="w-full max-w-sm flex flex-col items-center gap-8 animate-fade-in">
        {/* Minimal branding */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-200">
            <Icons.Logo size={16} />
          </div>
          <h1 className="text-xl font-medium tracking-tight text-neutral-200">Braid</h1>
          <p className="text-xs text-neutral-500">Minimal real-time collaborative editor</p>
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
              className="w-full px-4 py-2.5 rounded-lg bg-neutral-900/90 border border-neutral-800 text-sm text-neutral-200 placeholder-neutral-600 outline-none focus:border-neutral-600 transition-colors"
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
                className="w-full px-4 py-2.5 rounded-lg bg-neutral-900/90 border border-neutral-800 text-sm font-mono text-neutral-200 placeholder-neutral-600 outline-none focus:border-neutral-600 transition-colors"
              />
            </div>
          )}

          {error && <p className="text-xs text-rose-400 px-1">{error}</p>}

          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-neutral-200 hover:bg-white text-neutral-950 text-xs font-medium transition-all active:scale-[0.99] flex items-center justify-center gap-1.5 cursor-pointer mt-1"
          >
            <span>{isJoinMode ? 'Join Room' : 'Start Writing'}</span>
            <Icons.ArrowRight size={12} />
          </button>
        </form>

        {/* Minimal Mode Toggle */}
        <div className="flex items-center gap-3 text-xs text-neutral-500">
          <button
            type="button"
            onClick={() => {
              setIsJoinMode(!isJoinMode);
              setError('');
            }}
            className="hover:text-neutral-300 transition-colors cursor-pointer"
          >
            {isJoinMode ? '← Create a new room' : 'Have a room code? Join room'}
          </button>
        </div>
      </div>
    </div>
  );
}
