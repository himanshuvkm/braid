'use client';

import React, { useState, useTransition, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Icons } from '../../components/ui/icons';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/dashboard';

  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleLogin = async (loginEmail: string, loginPassword?: string, userId?: string) => {
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword || password,
          userId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid email or password');
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
    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    setError(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
        }),
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
    { id: 'user-himanshu', name: 'Himanshu', email: 'himanshu@braid.app', initial: 'H', color: '#d95338', role: 'Owner' },
    { id: 'user-alice', name: 'Alice', email: 'alice@braid.app', initial: 'A', color: '#3b82f6', role: 'Product Lead' },
    { id: 'user-bob', name: 'Bob', email: 'bob@braid.app', initial: 'B', color: '#10b981', role: 'Designer' },
  ];

  return (
    <div className="min-h-screen bg-[#faf9f6] flex flex-col justify-center items-center p-6 selection:bg-[#191919]/10">
      <div className="w-full max-w-md bg-[#ffffff] border border-[#e8e6e1] rounded-3xl p-8 sm:p-10 shadow-card flex flex-col gap-6 animate-fade-in">
        {/* Brand & Heading */}
        <div className="flex flex-col items-center text-center gap-2">
          <Link href="/" className="inline-flex items-center gap-2 mb-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-xl bg-[#191919] text-[#ffffff] flex items-center justify-center shadow-xs">
              <Icons.Logo size={18} />
            </div>
            <span className="font-bold text-xl tracking-tight text-[#191919]">Braid</span>
          </Link>

          <h1 className="text-2xl font-bold tracking-tight text-[#191919]">
            {tab === 'signin' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-xs text-[#64635e]">
            {tab === 'signin'
              ? 'Sign in to access your persistent workspace and documents'
              : 'Start building real-time collaborative documents'}
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex rounded-xl bg-[#f4f3ef] p-1 border border-[#e8e6e1]">
          <button
            type="button"
            onClick={() => {
              setTab('signin');
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              tab === 'signin' ? 'bg-[#ffffff] text-[#191919] shadow-xs' : 'text-[#64635e] hover:text-[#191919]'
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
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              tab === 'signup' ? 'bg-[#ffffff] text-[#191919] shadow-xs' : 'text-[#64635e] hover:text-[#191919]'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700">
            {error}
          </div>
        )}

        {/* Credentials Form */}
        <form
          onSubmit={tab === 'signin' ? (e) => { e.preventDefault(); handleLogin(email, password); } : handleRegister}
          className="flex flex-col gap-3.5"
        >
          {tab === 'signup' && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="auth-name" className="text-xs font-semibold text-[#191919]">
                Your Name
              </label>
              <input
                id="auth-name"
                type="text"
                placeholder="e.g. Himanshu"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf9f6] border border-[#e8e6e1] text-sm text-[#191919] placeholder-[#9a9994] outline-none focus:border-[#191919]"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="auth-email" className="text-xs font-semibold text-[#191919]">
              Email Address
            </label>
            <input
              id="auth-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf9f6] border border-[#e8e6e1] text-sm text-[#191919] placeholder-[#9a9994] outline-none focus:border-[#191919]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="auth-password" className="text-xs font-semibold text-[#191919]">
              Password {tab === 'signup' && <span className="text-[10px] text-[#9a9994] font-normal">(min. 8 characters)</span>}
            </label>
            <input
              id="auth-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf9f6] border border-[#e8e6e1] text-sm text-[#191919] placeholder-[#9a9994] outline-none focus:border-[#191919]"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2.5 rounded-xl bg-[#191919] text-[#ffffff] text-xs font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-xs flex items-center justify-center gap-1.5 mt-2 disabled:opacity-50"
          >
            <span>{isPending ? 'Authenticating...' : tab === 'signin' ? 'Sign In →' : 'Create Account →'}</span>
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-[1px] bg-[#e8e6e1]" />
          <span className="text-[10px] font-semibold text-[#9a9994] uppercase tracking-wider">or demo profiles</span>
          <div className="flex-1 h-[1px] bg-[#e8e6e1]" />
        </div>

        {/* 1-Click Demo Profiles (Enabled for development) */}
        <div className="grid grid-cols-3 gap-2">
          {demoUsers.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => handleLogin(u.email, 'password123', u.id)}
              disabled={isPending}
              className="flex flex-col items-center p-2.5 rounded-xl bg-[#faf9f6] border border-[#e8e6e1] hover:border-[#191919] hover:bg-[#ffffff] transition-all text-center group disabled:opacity-50"
            >
              <div
                className="w-7 h-7 rounded-full text-white flex items-center justify-center text-xs font-bold mb-1 group-hover:scale-105 transition-transform"
                style={{ backgroundColor: u.color }}
              >
                {u.initial}
              </div>
              <span className="text-xs font-semibold text-[#191919] truncate w-full">{u.name}</span>
              <span className="text-[10px] text-[#64635e] truncate w-full">{u.role}</span>
            </button>
          ))}
        </div>

        {/* Back Link */}
        <div className="text-center pt-2 border-t border-[#e8e6e1]">
          <Link href="/" className="text-xs text-[#64635e] hover:text-[#191919] transition-colors inline-flex items-center gap-1">
            <Icons.ArrowLeft size={12} />
            <span>Back to Braid</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#faf9f6] flex items-center justify-center text-xs text-[#64635e]">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
