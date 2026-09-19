'use client';

import React, { useState, useTransition, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Icons } from '../../components/ui/icons';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Divider } from '../../components/ui/divider';
import { Avatar } from '../../components/ui/avatar';

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
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-neutral-800 selection:text-neutral-200">
      <div className="w-full max-w-md bg-neutral-900/90 border border-neutral-800 rounded-2xl p-7 sm:p-9 shadow-2xl flex flex-col gap-6 animate-fade-in">
        {/* Brand & Heading */}
        <div className="flex flex-col items-center text-center gap-2">
          <Link href="/" className="inline-flex items-center gap-2 mb-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700 text-neutral-100 flex items-center justify-center shadow-xs">
              <Icons.Logo size={18} />
            </div>
            <span className="font-bold text-xl tracking-tight text-neutral-200">Braid</span>
          </Link>

          <h1 className="text-2xl font-bold tracking-tight text-neutral-100">
            {tab === 'signin' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-xs text-neutral-400 leading-relaxed">
            {tab === 'signin'
              ? 'Sign in to access your persistent workspace and documents'
              : 'Start building real-time collaborative documents'}
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex rounded-xl bg-neutral-950 p-1 border border-neutral-800">
          <button
            type="button"
            onClick={() => {
              setTab('signin');
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 ${
              tab === 'signin' ? 'bg-neutral-800 text-neutral-100 shadow-xs' : 'text-neutral-400 hover:text-neutral-200'
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
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 ${
              tab === 'signup' ? 'bg-neutral-800 text-neutral-100 shadow-xs' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-red-950/40 border border-red-800 text-xs font-medium text-red-300 flex items-center gap-2 animate-fade-in"
          >
            <Icons.AlertCircle size={14} className="shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form
          onSubmit={tab === 'signin' ? (e) => { e.preventDefault(); handleLogin(email, password); } : handleRegister}
          className="flex flex-col gap-3.5"
        >
          {tab === 'signup' && (
            <Input
              id="auth-name"
              label="Your Name"
              type="text"
              placeholder="e.g. Himanshu"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}

          <Input
            id="auth-email"
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            id="auth-password"
            label={tab === 'signup' ? 'Password (min. 8 characters)' : 'Password'}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2.5 rounded-xl bg-neutral-200 hover:bg-white text-neutral-950 text-xs font-semibold transition-all active:scale-[0.99] flex items-center justify-center gap-1.5 cursor-pointer mt-2 disabled:opacity-50"
          >
            {isPending && <Icons.Spinner size={14} className="animate-spin" />}
            <span>{tab === 'signin' ? 'Sign In' : 'Create Account'}</span>
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 w-full my-1">
          <div className="flex-1 h-[1px] bg-neutral-800" />
          <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider select-none">
            or demo profiles
          </span>
          <div className="flex-1 h-[1px] bg-neutral-800" />
        </div>

        {/* 1-Click Demo Profiles */}
        <div className="grid grid-cols-3 gap-2">
          {demoUsers.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => handleLogin(u.email, 'password123', u.id)}
              disabled={isPending}
              className="flex flex-col items-center p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/60 transition-all text-center group disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 cursor-pointer"
            >
              <Avatar
                name={u.name}
                color={u.color}
                size="sm"
                className="mb-1.5 group-hover:scale-105 transition-transform"
              />
              <span className="text-xs font-semibold text-neutral-200 truncate w-full">{u.name}</span>
              <span className="text-[10px] text-neutral-400 truncate w-full">{u.role}</span>
            </button>
          ))}
        </div>

        {/* Back Link */}
        <div className="text-center pt-2 border-t border-neutral-800">
          <Link href="/" className="text-xs text-neutral-400 hover:text-neutral-200 transition-colors inline-flex items-center gap-1.5">
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
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-xs text-neutral-500">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
