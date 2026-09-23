'use client';

import React, { useState, useTransition, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Icons } from '../../components/ui/icons';
import { Input } from '../../components/ui/input';
import { ThemeToggle } from '../../components/ui/theme-toggle';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/dashboard';

  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(searchParams.get('error') || null);
  const [socialLoading, setSocialLoading] = useState<'google' | 'github' | null>(null);
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

  const handleSocialAuth = (provider: 'google' | 'github') => {
    setError(null);
    setSocialLoading(provider);
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `/api/auth/oauth/${provider}?from=${encodeURIComponent(from)}`;
  };

  return (
    <div className="editorial-grid relative flex min-h-screen flex-col items-center justify-center bg-[var(--background)] p-4 text-[var(--ink)] selection:bg-[var(--accent-subtle)] sm:p-8">
      {/* Top Right Theme Toggle */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-9 flex flex-col gap-5 sm:gap-6">
        {/* Brand & Heading */}
        <div className="flex flex-col items-center text-center gap-1.5 sm:gap-2">
          <Link href="/" className="inline-flex items-center gap-2 mb-1 sm:mb-2 hover:opacity-85 transition-opacity">
            <div className="w-9 h-9 bg-[var(--accent)] text-white flex items-center justify-center">
              <Icons.Logo size={20} />
            </div>
            <span className="font-display text-xl tracking-tight text-[var(--ink)]">Braid</span>
          </Link>

          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--accent)]">AUTH / {tab === 'signin' ? '01' : '02'}</span>
          <h1 className="font-display text-3xl font-normal uppercase tracking-tight text-[var(--ink)] sm:text-4xl">
            {tab === 'signin' ? 'Welcome back' : 'Create your account'}
          </h1>
            <p className="text-xs text-[var(--muted)] leading-relaxed">
            {tab === 'signin'
              ? 'Sign in to access your persistent workspace and documents'
              : 'Start building real-time collaborative documents'}
          </p>
        </div>

        {/* 2 Social Buttons Left & Right: Google and GitHub */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleSocialAuth('google')}
            disabled={socialLoading !== null || isPending}
            className="h-10 border border-[var(--line)] bg-transparent px-3 text-[10px] font-mono uppercase tracking-wider text-[var(--ink)] flex items-center justify-center gap-2 transition-colors hover:border-[var(--accent)] cursor-pointer disabled:opacity-50"
          >
            {socialLoading === 'google' ? (
              <Icons.Spinner size={15} className="animate-spin text-[var(--text)]" />
            ) : (
              <Icons.Google size={16} />
            )}
            <span>Google</span>
          </button>

          <button
            type="button"
            onClick={() => handleSocialAuth('github')}
            disabled={socialLoading !== null || isPending}
            className="h-10 border border-[var(--line)] bg-transparent px-3 text-[10px] font-mono uppercase tracking-wider text-[var(--ink)] flex items-center justify-center gap-2 transition-colors hover:border-[var(--accent)] cursor-pointer disabled:opacity-50"
          >
            {socialLoading === 'github' ? (
              <Icons.Spinner size={15} className="animate-spin text-[var(--text)]" />
            ) : (
              <Icons.GitHub size={16} className="text-[var(--text)]" />
            )}
            <span>GitHub</span>
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 w-full my-0.5">
          <div className="flex-1 h-[1px] bg-[var(--border)]" />
          <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--muted)] select-none">
            or with email
          </span>
          <div className="flex-1 h-[1px] bg-[var(--border)]" />
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
              placeholder="e.g. Alex"
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
            disabled={isPending || socialLoading !== null}
            className="mt-1 flex h-11 w-full items-center justify-center gap-1.5 bg-[var(--accent)] text-[10px] font-mono font-semibold uppercase tracking-wider text-white transition-colors hover:bg-[var(--accent-hover)] cursor-pointer disabled:opacity-50"
          >
            {isPending && <Icons.Spinner size={14} className="animate-spin" />}
            <span>{tab === 'signin' ? 'Sign In' : 'Sign Up'}</span>
          </button>
        </form>

        {/* Switcher / Bottom Tab Selector */}
        <div className="flex items-center justify-center gap-1.5 border-t border-[var(--line)] pt-4 text-xs text-[var(--muted)]">
          <span>
            {tab === 'signin' ? "Don't have an account?" : 'Already have an account?'}
          </span>
          <button
            type="button"
            onClick={() => {
              setTab(tab === 'signin' ? 'signup' : 'signin');
              setError(null);
            }}
            className="font-semibold text-[var(--accent)] hover:underline cursor-pointer"
          >
            {tab === 'signin' ? 'Sign Up' : 'Sign In'}
          </button>
        </div>

        {/* Back Link */}
        <div className="text-center pt-2">
          <Link href="/" className="text-xs text-[var(--text-subtle)] hover:text-[var(--text)] transition-colors inline-flex items-center gap-1.5">
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
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)] flex items-center justify-center text-xs text-[var(--text-subtle)]">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
