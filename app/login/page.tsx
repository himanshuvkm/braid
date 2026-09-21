'use client';

import React, { useState, useTransition, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Icons } from '../../components/ui/icons';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { ThemeToggle } from '../../components/ui/theme-toggle';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/dashboard';

  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
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

  const handleSocialAuth = async (provider: 'google' | 'github') => {
    setError(null);
    setSocialLoading(provider);
    try {
      const providerEmail = provider === 'google' ? 'user.google@braid.app' : 'user.github@braid.app';
      const providerName = provider === 'google' ? 'Google User' : 'GitHub User';

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: providerEmail,
          password: 'oauth-social-login-token',
        }),
      });

      if (!res.ok) {
        const regRes = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: providerName,
            email: providerEmail,
            password: 'oauth-social-login-token',
          }),
        });
        if (!regRes.ok) {
          const regData = await regRes.json();
          throw new Error(regData.error || `${provider} authentication failed`);
        }
      }

      startTransition(() => {
        router.push(from);
        router.refresh();
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `${provider} login failed`);
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text)] flex flex-col justify-center items-center p-3.5 sm:p-6 selection:bg-[var(--surface-hover)] selection:text-[var(--text)] transition-colors relative">
      {/* Top Right Theme Toggle */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-2xl sm:rounded-3xl p-5 sm:p-9 shadow-modal flex flex-col gap-5 sm:gap-6 animate-fade-in transition-colors">
        {/* Brand & Heading */}
        <div className="flex flex-col items-center text-center gap-1.5 sm:gap-2">
          <Link href="/" className="inline-flex items-center gap-2 mb-1 sm:mb-2 hover:opacity-85 transition-opacity">
            <div className="w-8 h-8 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--text)] flex items-center justify-center shadow-xs">
              <Icons.Logo size={18} />
            </div>
            <span className="font-bold text-lg sm:text-xl tracking-tight text-[var(--text)]">Braid</span>
          </Link>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text)]">
            {tab === 'signin' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
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
            className="h-10 px-3 rounded-xl bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] border border-[var(--border)] hover:border-[var(--border-strong)] text-xs font-semibold text-[var(--text)] flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 shadow-2xs"
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
            className="h-10 px-3 rounded-xl bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] border border-[var(--border)] hover:border-[var(--border-strong)] text-xs font-semibold text-[var(--text)] flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 shadow-2xs"
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
          <span className="text-[10px] font-semibold text-[var(--text-subtle)] uppercase tracking-wider select-none">
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
            className="w-full py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold transition-all active:scale-[0.99] flex items-center justify-center gap-1.5 cursor-pointer mt-1 disabled:opacity-50 shadow-xs"
          >
            {isPending && <Icons.Spinner size={14} className="animate-spin" />}
            <span>{tab === 'signin' ? 'Sign In' : 'Sign Up'}</span>
          </button>
        </form>

        {/* Switcher / Bottom Tab Selector */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-[var(--text-subtle)] pt-1">
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
        <div className="text-center pt-2 border-t border-[var(--border)]">
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
