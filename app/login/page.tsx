'use client';

import React, { useState, useTransition, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/dashboard';

  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleLogin = async (loginEmail: string, loginName?: string, userId?: string) => {
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, name: loginName, userId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to sign in');
      }

      startTransition(() => {
        router.push(from);
        router.refresh();
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Please fill in both name and email');
      return;
    }
    setError(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      startTransition(() => {
        router.push(from);
        router.refresh();
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    }
  };

  const demoUsers = [
    { id: 'user-alice', name: 'Alice', email: 'alice@braid.app', avatar: '👩‍💻', role: 'Product Lead' },
    { id: 'user-bob', name: 'Bob', email: 'bob@braid.app', avatar: '👨‍🎨', role: 'Designer' },
    { id: 'user-Ajay', name: 'Ajay', email: 'Ajay@braid.app', avatar: '🚀', role: 'Engineer' },
  ];

  return (
    <div className="min-h-screen bg-[#faf8f5] flex flex-col justify-center items-center p-4 selection:bg-[#6366f1]/20">
      {/* Container */}
      <div className="w-full max-w-md bg-[#ffffff] border border-[#e4e4e7] rounded-3xl p-8 shadow-sm flex flex-col gap-6">
        {/* Brand & Heading */}
        <div className="flex flex-col items-center text-center gap-2">
          <Link href="/" className="inline-flex items-center gap-2 mb-2 hover:opacity-80 transition-opacity">
            <span className="w-8 h-8 rounded-xl bg-[#000000] text-[#ffffff] flex items-center justify-center font-bold text-sm">
              B
            </span>
            <span className="font-black text-xl tracking-tight text-[#000000]">Braid</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-[#000000]">
            {tab === 'signin' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-xs text-[#666666]">
            {tab === 'signin'
              ? 'Sign in to access your persistent projects and collaborative workspaces'
              : 'Start building real-time collaborative docs with Braid'}
          </p>
        </div>

        {/* 1-Click Demo Profiles (For effortless multi-user testing) */}
        <div className="flex flex-col gap-2 p-3.5 bg-[#faf8f5] rounded-2xl border border-[#e4e4e7]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#666666] px-1">
            ⚡ Quick 1-Click Demo Profiles
          </div>
          <div className="grid grid-cols-3 gap-2">
            {demoUsers.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => handleLogin(u.email, u.name, u.id)}
                disabled={isPending}
                className="flex flex-col items-center p-2 rounded-xl bg-[#ffffff] border border-[#e4e4e7] hover:border-[#000000] transition-all text-center group disabled:opacity-50"
              >
                <span className="text-xl mb-1 group-hover:scale-110 transition-transform">{u.avatar}</span>
                <span className="text-xs font-bold text-[#000000] truncate w-full">{u.name}</span>
                <span className="text-[10px] text-[#666666] truncate w-full">{u.role}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-[1px] bg-[#e4e4e7]" />
          <span className="text-[11px] font-semibold text-[#666666] uppercase">or continue with email</span>
          <div className="flex-1 h-[1px] bg-[#e4e4e7]" />
        </div>

        {/* Auth Mode Tabs */}
        <div className="flex rounded-xl bg-[#faf8f5] p-1 border border-[#e4e4e7]">
          <button
            type="button"
            onClick={() => {
              setTab('signin');
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${tab === 'signin' ? 'bg-[#ffffff] text-[#000000] shadow-sm' : 'text-[#666666] hover:text-[#000000]'
              }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('signup');
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${tab === 'signup' ? 'bg-[#ffffff] text-[#000000] shadow-sm' : 'text-[#666666] hover:text-[#000000]'
              }`}
          >
            Sign Up
          </button>
        </div>

        {/* Form Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700">
            {error}
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={tab === 'signin' ? (e) => { e.preventDefault(); handleLogin(email, name); } : handleRegister}
          className="flex flex-col gap-3.5"
        >
          {tab === 'signup' && (
            <div>
              <label htmlFor="auth-name" className="block text-xs font-bold text-[#000000] mb-1">
                Your Name
              </label>
              <input
                id="auth-name"
                type="text"
                placeholder="e.g. Alice Johnson"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#ffffff] border border-[#e4e4e7] text-sm text-[#000000] placeholder-[#666666]/40 outline-none focus:border-[#000000] transition-colors"
              />
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="block text-xs font-bold text-[#000000] mb-1">
              Email Address
            </label>
            <input
              id="auth-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#ffffff] border border-[#e4e4e7] text-sm text-[#000000] placeholder-[#666666]/40 outline-none focus:border-[#000000] transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2.5 rounded-xl bg-[#000000] text-[#ffffff] text-xs font-bold hover:opacity-90 active:scale-[0.99] transition-all shadow-sm flex items-center justify-center gap-1.5 mt-2 disabled:opacity-50"
          >
            <span>{isPending ? 'Signing in...' : tab === 'signin' ? 'Sign In →' : 'Create Account →'}</span>
          </button>
        </form>

        {/* Footer */}
        <div className="text-center pt-2 border-t border-[#e4e4e7]">
          <Link href="/" className="text-xs text-[#666666] hover:text-[#000000] transition-colors">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#faf8f5] flex items-center justify-center text-xs text-[#666666]">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
