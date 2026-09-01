'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { generateRoomId, setStoredUserName, setStoredRoomName, getStoredUserName } from '../lib/room-storage';
import { Icons } from '../components/ui/icons';

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');

  // Form states
  const [roomName, setRoomName] = useState('');
  const [userName, setUserName] = useState(() => getStoredUserName() || '');
  const [joinId, setJoinId] = useState('');
  const [errors, setErrors] = useState<{ name?: string; user?: string; id?: string }>({});

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { name?: string; user?: string } = {};
    if (!roomName.trim()) newErrors.name = 'Please enter a room name';
    if (!userName.trim()) newErrors.user = 'Please enter your name';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const roomId = generateRoomId();
    setStoredUserName(userName.trim());
    setStoredRoomName(roomId, roomName.trim());
    router.push(`/doc/${roomId}?name=${encodeURIComponent(roomName.trim())}&user=${encodeURIComponent(userName.trim())}`);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { id?: string; user?: string } = {};
    let rawId = joinId.trim();
    if (rawId.includes('/doc/')) {
      rawId = rawId.split('/doc/')[1].split('?')[0].split('#')[0];
    } else if (rawId.includes('/project/')) {
      rawId = rawId.split('/project/')[1].split('?')[0].split('#')[0];
    }

    if (!rawId) newErrors.id = 'Please enter a valid room ID or link';
    if (!userName.trim()) newErrors.user = 'Please enter your name';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setStoredUserName(userName.trim());
    if (rawId.startsWith('proj-')) {
      router.push(`/project/${encodeURIComponent(rawId)}`);
    } else {
      router.push(`/doc/${encodeURIComponent(rawId)}?user=${encodeURIComponent(userName.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#191919] flex flex-col selection:bg-[#191919]/10">
      {/* Top Navbar */}
      <header className="w-full border-b border-[#e8e6e1] bg-[#faf9f6]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-7 h-7 rounded-lg bg-[#191919] text-[#ffffff] flex items-center justify-center shadow-xs">
                <Icons.Logo size={16} />
              </div>
              <span className="font-bold text-lg tracking-tight text-[#191919]">Braid</span>
            </Link>

            <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-[#64635e]">
              <a href="#features" className="hover:text-[#191919] transition-colors">Features</a>
              <a href="#architecture" className="hover:text-[#191919] transition-colors">CRDT Engine</a>
              <a href="#teams" className="hover:text-[#191919] transition-colors">For Teams</a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-medium px-4 py-2 text-[#64635e] hover:text-[#191919] transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="text-xs font-medium px-4 py-2 rounded-xl bg-[#191919] text-[#ffffff] hover:opacity-90 active:scale-[0.98] transition-all shadow-xs flex items-center gap-1.5"
            >
              <span>Workspace</span>
              <Icons.ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center">
        <section className="w-full max-w-4xl mx-auto px-6 pt-16 pb-12 text-center flex flex-col items-center gap-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#f4f3ef] border border-[#e8e6e1] text-xs font-medium text-[#64635e]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-glow" />
            <span>Conflict-Free Real-Time Documents</span>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-[#191919] leading-[1.05] max-w-3xl">
            Documents, together.
          </h1>

          <p className="text-lg sm:text-xl text-[#64635e] max-w-2xl font-normal leading-relaxed">
            Write, think, and collaborate in real time without getting in each other&apos;s way. Built on pure CRDT mathematics for instant sync and offline peace of mind.
          </p>

          {/* Interactive Room Creation / Join Bento Box */}
          <div className="w-full max-w-lg mt-2 bg-[#ffffff] border border-[#e8e6e1] rounded-3xl p-6 sm:p-7 shadow-card text-left flex flex-col gap-4 animate-fade-in">
            {/* Tabs */}
            <div className="flex rounded-xl bg-[#f4f3ef] p-1 border border-[#e8e6e1]">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('create');
                  setErrors({});
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'create'
                    ? 'bg-[#ffffff] text-[#191919] shadow-xs'
                    : 'text-[#64635e] hover:text-[#191919]'
                }`}
              >
                Create a Room
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('join');
                  setErrors({});
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'join'
                    ? 'bg-[#ffffff] text-[#191919] shadow-xs'
                    : 'text-[#64635e] hover:text-[#191919]'
                }`}
              >
                Join a Room
              </button>
            </div>

            {/* Create Room Form */}
            {activeTab === 'create' ? (
              <form onSubmit={handleCreate} className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="create-doc-name" className="text-xs font-semibold text-[#191919]">
                    Room Name
                  </label>
                  <input
                    id="create-doc-name"
                    type="text"
                    placeholder="e.g. Product Strategy Q4"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf9f6] border border-[#e8e6e1] text-sm text-[#191919] placeholder-[#9a9994] outline-none focus:border-[#191919]"
                  />
                  {errors.name && <p className="text-xs text-red-600 font-medium">{errors.name}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="create-user-name" className="text-xs font-semibold text-[#191919]">
                    Your Name
                  </label>
                  <input
                    id="create-user-name"
                    type="text"
                    placeholder="e.g. Himanshu"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf9f6] border border-[#e8e6e1] text-sm text-[#191919] placeholder-[#9a9994] outline-none focus:border-[#191919]"
                  />
                  {errors.user && <p className="text-xs text-red-600 font-medium">{errors.user}</p>}
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#191919] text-[#ffffff] text-xs font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-xs flex items-center justify-center gap-1.5 mt-1"
                >
                  <span>Create Room</span>
                  <Icons.ArrowRight size={13} />
                </button>
              </form>
            ) : (
              <form onSubmit={handleJoin} className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="join-doc-id" className="text-xs font-semibold text-[#191919]">
                    Room Name or Link
                  </label>
                  <input
                    id="join-doc-id"
                    type="text"
                    placeholder="e.g. demo, doc-4k9z2a, or link"
                    value={joinId}
                    onChange={(e) => setJoinId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf9f6] border border-[#e8e6e1] text-sm font-mono text-[#191919] placeholder-[#9a9994] outline-none focus:border-[#191919]"
                  />
                  {errors.id && <p className="text-xs text-red-600 font-medium">{errors.id}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="join-user-name" className="text-xs font-semibold text-[#191919]">
                    Your Name
                  </label>
                  <input
                    id="join-user-name"
                    type="text"
                    placeholder="e.g. Alice"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf9f6] border border-[#e8e6e1] text-sm text-[#191919] placeholder-[#9a9994] outline-none focus:border-[#191919]"
                  />
                  {errors.user && <p className="text-xs text-red-600 font-medium">{errors.user}</p>}
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#191919] text-[#ffffff] text-xs font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-xs flex items-center justify-center gap-1.5 mt-1"
                >
                  <span>Join Room</span>
                  <Icons.ArrowRight size={13} />
                </button>
              </form>
            )}
          </div>

          {/* Interactive Hero Document Preview Card */}
          <div className="w-full max-w-3xl mt-8 rounded-2xl bg-[#ffffff] border border-[#e8e6e1] shadow-card text-left overflow-hidden transition-all hover:shadow-lg">
            {/* Window bar */}
            <div className="px-5 py-3.5 bg-[#faf9f6] border-b border-[#e8e6e1] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#e8e6e1]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#e8e6e1]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#e8e6e1]" />
                <span className="text-xs font-medium text-[#64635e] ml-2">Product Roadmap.braid</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>3 active peers</span>
                </div>

                {/* Avatar stack */}
                <div className="flex items-center -space-x-1.5">
                  <div className="w-6 h-6 rounded-full bg-[#d95338] text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-white" title="Himanshu">
                    H
                  </div>
                  <div className="w-6 h-6 rounded-full bg-[#3b82f6] text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-white" title="Alice">
                    A
                  </div>
                  <div className="w-6 h-6 rounded-full bg-[#10b981] text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-white" title="Bob">
                    B
                  </div>
                </div>
              </div>
            </div>

            {/* Document Content Canvas */}
            <div className="p-8 sm:p-10 flex flex-col gap-4 font-sans text-sm text-[#191919]">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#191919]">
                Q3 Architecture & Real-Time Sync
              </h2>

              <p className="text-[#64635e] leading-relaxed">
                We are building a collaborative workspace where everyone writes in harmony without locking or waiting for remote sync servers.
              </p>

              <div className="flex flex-col gap-2 pt-2">
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="w-4 h-4 rounded bg-[#191919] text-white flex items-center justify-center text-[10px]">✓</span>
                  <span className="line-through text-[#9a9994]">Character-level RGA CRDT engine with Lamport clocks</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="w-4 h-4 rounded bg-[#191919] text-white flex items-center justify-center text-[10px]">✓</span>
                  <span className="line-through text-[#9a9994]">Offline operation queues & automatic reconnect backoff</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="w-4 h-4 rounded border border-[#64635e] flex items-center justify-center text-[10px]" />
                  <span className="font-medium text-[#191919]">Persistent project storage and granular member permissions</span>
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-mono">Alice editing</span>
                </div>
              </div>

              {/* Callout box */}
              <div className="mt-3 p-4 rounded-xl bg-[#f4f3ef] border border-[#e8e6e1] flex items-start gap-3 text-xs text-[#191919]">
                <Icons.Sparkles size={16} className="text-[#d95338] shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold">Pure Convergence Guarantee</span>
                  <span className="text-[#64635e]">Every peer converges to the identical document order regardless of network latency or delivery order.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Highlights Section */}
        <section id="features" className="w-full max-w-5xl mx-auto px-6 py-20 border-t border-[#e8e6e1] grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-7 rounded-2xl bg-[#ffffff] border border-[#e8e6e1] shadow-card flex flex-col gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#f4f3ef] flex items-center justify-center text-[#191919]">
              <Icons.Zap size={20} />
            </div>
            <h3 className="text-base font-bold text-[#191919]">Instant Real-Time Sync</h3>
            <p className="text-xs text-[#64635e] leading-relaxed">
              Every keystroke merges immediately through WebSockets with sub-10ms local responsiveness and zero locking.
            </p>
          </div>

          <div className="p-7 rounded-2xl bg-[#ffffff] border border-[#e8e6e1] shadow-card flex flex-col gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#f4f3ef] flex items-center justify-center text-[#191919]">
              <Icons.Document size={20} />
            </div>
            <h3 className="text-base font-bold text-[#191919]">Structured Block Editor</h3>
            <p className="text-xs text-[#64635e] leading-relaxed">
              Notion-style blocks: Headings, checkboxes, quotes, code blocks, and markdown shortcuts with a floating slash menu.
            </p>
          </div>

          <div className="p-7 rounded-2xl bg-[#ffffff] border border-[#e8e6e1] shadow-card flex flex-col gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#f4f3ef] flex items-center justify-center text-[#191919]">
              <Icons.Shield size={20} />
            </div>
            <h3 className="text-base font-bold text-[#191919]">Granular Authorization</h3>
            <p className="text-xs text-[#64635e] leading-relaxed">
              Role-based access (Owner, Editor, Viewer) enforced on both HTTP routes and WebSocket collaboration streams.
            </p>
          </div>
        </section>

        {/* Bottom CTA Banner */}
        <section className="w-full max-w-4xl mx-auto px-6 py-16 text-center flex flex-col items-center gap-5">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#191919]">
            Your next document starts here.
          </h2>
          <p className="text-sm text-[#64635e] max-w-md">
            Join thousands of writers and teams building better documents without merge conflicts.
          </p>
          <Link
            href="/dashboard"
            className="px-6 py-3 rounded-xl bg-[#191919] text-[#ffffff] text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-sm"
          >
            Open Workspace
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#e8e6e1] py-8 px-6 text-center text-xs text-[#64635e]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Icons.Logo size={14} />
            <span className="font-semibold text-[#191919]">Braid</span>
            <span>— Conflict-Free Collaborative Document Editor</span>
          </div>
          <div>Pure RGA CRDT • Lamport Clocks • Offline Queues</div>
        </div>
      </footer>
    </div>
  );
}
