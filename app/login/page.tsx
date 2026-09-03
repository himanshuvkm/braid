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
    <div className="min-h-screen bg-[#faf9f6] flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-[#191919]/10">
      <div className="w-full max-w-md bg-[#ffffff] border border-[#e8e6e1] rounded-2xl p-7 sm:p-9 shadow-modal flex flex-col gap-6 animate-fade-in">
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
          <p className="text-xs text-[#64635e] leading-relaxed">
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
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#191919]/20 ${
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
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#191919]/20 ${
              tab === 'signup' ? 'bg-[#ffffff] text-[#191919] shadow-xs' : 'text-[#64635e] hover:text-[#191919]'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700 flex items-center gap-2 animate-fade-in"
          >
            <Icons.AlertCircle size={14} className="shrink-0 text-red-600" />
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

          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isPending}
            fullWidth
            className="mt-2"
          >
            {tab === 'signin' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        {/* Divider */}
        <Divider label="or demo profiles" />

        {/* 1-Click Demo Profiles */}
        <div className="grid grid-cols-3 gap-2">
          {demoUsers.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => handleLogin(u.email, 'password123', u.id)}
              disabled={isPending}
              className="flex flex-col items-center p-2.5 rounded-xl bg-[#faf9f6] border border-[#e8e6e1] hover:border-[#191919] hover:bg-[#ffffff] transition-all text-center group disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#191919]/20"
            >
              <Avatar
                name={u.name}
                color={u.color}
                size="sm"
                className="mb-1.5 group-hover:scale-105 transition-transform"
              />
              <span className="text-xs font-semibold text-[#191919] truncate w-full">{u.name}</span>
              <span className="text-[10px] text-[#64635e] truncate w-full">{u.role}</span>
            </button>
          ))}
        </div>

        {/* Back Link */}
        <div className="text-center pt-2 border-t border-[#e8e6e1]">
          <Link href="/" className="text-xs text-[#64635e] hover:text-[#191919] transition-colors inline-flex items-center gap-1.5">
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
