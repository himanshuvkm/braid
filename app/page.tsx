'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { generateRoomId, setStoredUserName, setStoredRoomName, getStoredUserName } from '../lib/room-storage';
import { Icons } from '../components/ui/icons';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Avatar } from '../components/ui/avatar';

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');

  // Form states
  const [roomName, setRoomName] = useState('');
  const [userName, setUserName] = useState(() => getStoredUserName() || '');
  const [joinId, setJoinId] = useState('');
  const [errors, setErrors] = useState<{ name?: string; user?: string; id?: string }>({});

  // Simulated interactive preview state
  const [interactiveCheck, setInteractiveCheck] = useState(false);
  const [previewTypedText, setPreviewTypedText] = useState('We are designing collaborative software');

  // Subtle simulated typing effect in preview
  useEffect(() => {
    const phrases = [
      'We are designing collaborative software',
      'Where everyone writes in real time without locking',
      'Pure CRDT mathematics ensure instant convergence',
      'Offline queues reconnect seamlessly with zero loss',
    ];
    let phraseIndex = 0;
    let charIndex = phrases[0].length;
    let isDeleting = true;

    const interval = setInterval(() => {
      const currentPhrase = phrases[phraseIndex];
      if (isDeleting) {
        if (charIndex > 18) {
          charIndex -= 1;
          setPreviewTypedText(currentPhrase.slice(0, charIndex));
        } else {
          isDeleting = false;
          phraseIndex = (phraseIndex + 1) % phrases.length;
        }
      } else {
        if (charIndex < currentPhrase.length) {
          charIndex += 1;
          setPreviewTypedText(currentPhrase.slice(0, charIndex));
        } else {
          isDeleting = true;
        }
      }
    }, 90);

    return () => clearInterval(interval);
  }, []);

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
      <header className="w-full border-b border-[#e8e6e1] bg-[#faf9f6]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6 sm:gap-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-7 h-7 rounded-lg bg-[#191919] text-[#ffffff] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <Icons.Logo size={15} />
              </div>
              <span className="font-bold text-base sm:text-lg tracking-tight text-[#191919]">Braid</span>
            </Link>

            <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-[#64635e]">
              <a href="#product-preview" className="hover:text-[#191919] transition-colors">Product</a>
              <a href="#features" className="hover:text-[#191919] transition-colors">Architecture</a>
              <a href="#organization" className="hover:text-[#191919] transition-colors">Workspace</a>
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="text-xs font-medium px-3 py-1.5 text-[#64635e] hover:text-[#191919] transition-colors"
            >
              Sign In
            </Link>
            <Link href="/dashboard">
              <Button
                variant="primary"
                size="sm"
                rightIcon={<Icons.ArrowRight size={12} />}
              >
                Open Workspace
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center">
        <section className="w-full max-w-4xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-10 text-center flex flex-col items-center gap-5 sm:gap-6">
          {/* Status Indicator */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#f4f3ef] border border-[#e8e6e1] text-xs font-medium text-[#64635e] animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-glow" />
            <span>Conflict-Free Real-Time Documents</span>
            <span className="text-[#d4d2cc] hidden sm:inline">•</span>
            <span className="text-[#9a9994] hidden sm:inline">CRDT Sync Active</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-[#191919] leading-[1.06] max-w-3xl">
            Documents, together.
          </h1>

          {/* Supporting Copy */}
          <p className="text-base sm:text-lg text-[#64635e] max-w-2xl font-normal leading-relaxed">
            Collaborative documents with real-time editing, simple workspace organization, and reliable persistence. Built on pure CRDT mathematics for instant sync without merge conflicts.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link href="/dashboard">
              <Button variant="primary" size="lg" rightIcon={<Icons.ArrowRight size={14} />}>
                Create a document
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="lg">
                Join workspace
              </Button>
            </Link>
          </div>

          {/* Interactive Room Creation / Join Bento Box */}
          <div className="w-full max-w-md mt-6 bg-[#ffffff] border border-[#e8e6e1] rounded-2xl p-5 sm:p-6 shadow-card text-left flex flex-col gap-4 animate-fade-in">
            {/* Tabs */}
            <div className="flex rounded-xl bg-[#f4f3ef] p-1 border border-[#e8e6e1]">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('create');
                  setErrors({});
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#191919]/20 ${
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
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#191919]/20 ${
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
              <form onSubmit={handleCreate} className="flex flex-col gap-3">
                <Input
                  id="create-doc-name"
                  label="Room Name"
                  placeholder="e.g. Product Roadmap"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  error={errors.name}
                  inputSize="sm"
                />

                <Input
                  id="create-user-name"
                  label="Your Name"
                  placeholder="e.g. Himanshu"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  error={errors.user}
                  inputSize="sm"
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  fullWidth
                  rightIcon={<Icons.ArrowRight size={13} />}
                  className="mt-0.5"
                >
                  Create Room
                </Button>
              </form>
            ) : (
              <form onSubmit={handleJoin} className="flex flex-col gap-3">
                <Input
                  id="join-doc-id"
                  label="Room Name or Link"
                  placeholder="e.g. demo, doc-4k9z2a, or link"
                  value={joinId}
                  onChange={(e) => setJoinId(e.target.value)}
                  error={errors.id}
                  className="font-mono"
                  inputSize="sm"
                />

                <Input
                  id="join-user-name"
                  label="Your Name"
                  placeholder="e.g. Alice"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  error={errors.user}
                  inputSize="sm"
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  fullWidth
                  rightIcon={<Icons.ArrowRight size={13} />}
                  className="mt-0.5"
                >
                  Join Room
                </Button>
              </form>
            )}
          </div>
        </section>

        {/* Interactive Product Preview Canvas */}
        <section id="product-preview" className="w-full max-w-4xl mx-auto px-4 sm:px-6 pb-16">
          <div className="w-full rounded-2xl bg-[#ffffff] border border-[#e8e6e1] shadow-modal overflow-hidden text-left transition-all hover:border-[#d4d2cc]">
            {/* Editor Window Header Bar */}
            <div className="px-4 sm:px-6 py-3 bg-[#faf9f6] border-b border-[#e8e6e1] flex items-center justify-between gap-3">
              {/* Window Controls & Document Title */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#d4d2cc]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#d4d2cc]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#d4d2cc]" />
                </div>
                <span className="text-xs font-semibold text-[#191919] font-mono ml-1.5 truncate">
                  Product Roadmap.braid
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#f4f3ef] text-[#64635e] uppercase tracking-wider hidden sm:inline">
                  CRDT
                </span>
              </div>

              {/* Right: Autosave Pill, Active Peers, & Collaborator Stack */}
              <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                {/* Autosave Status Indicator */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f4f3ef] border border-[#e8e6e1] text-[11px] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[#64635e]">✓ Saved to DB</span>
                </div>

                {/* Peer Count Pill */}
                <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>3 active peers</span>
                </div>

                {/* Avatar Stack */}
                <div className="flex items-center -space-x-1.5">
                  <Avatar name="Himanshu" color="#d95338" size="sm" className="ring-2 ring-white" />
                  <Avatar name="Alice" color="#3b82f6" size="sm" className="ring-2 ring-white" />
                  <Avatar name="Bob" color="#10b981" size="sm" className="ring-2 ring-white" />
                </div>
              </div>
            </div>

            {/* Document Content Canvas */}
            <div className="p-6 sm:p-10 flex flex-col gap-5 font-sans text-sm text-[#191919]">
              {/* Document H1 Title */}
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9a9994]">
                  Collaborative Specification
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#191919] mt-1">
                  Q3 Architecture & Real-Time Sync
                </h2>
              </div>

              {/* Body Paragraph with Live Simulated Cursor */}
              <div className="relative p-3 rounded-xl bg-[#faf9f6]/70 border border-[#e8e6e1]/80 leading-relaxed text-[#191919]">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#3b82f6]" />
                  <span className="text-[10px] font-bold text-[#3b82f6] uppercase tracking-wider">
                    Alice editing
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#64635e]">
                  <span>{previewTypedText}</span>
                  <span className="inline-block w-0.5 h-4 bg-[#3b82f6] ml-0.5 align-middle animate-pulse" />
                </p>
              </div>

              {/* Interactive Checklist Blocks */}
              <div className="flex flex-col gap-2.5 pt-1">
                <div className="text-xs font-semibold text-[#191919]">Execution Roadmap:</div>
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="w-4 h-4 rounded bg-[#191919] text-white flex items-center justify-center text-[10px]">
                    ✓
                  </span>
                  <span className="line-through text-[#9a9994]">
                    Character-level RGA CRDT engine with Lamport clocks
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="w-4 h-4 rounded bg-[#191919] text-white flex items-center justify-center text-[10px]">
                    ✓
                  </span>
                  <span className="line-through text-[#9a9994]">
                    Offline operation queues & automatic reconnect backoff
                  </span>
                </div>
                <div
                  onClick={() => setInteractiveCheck(!interactiveCheck)}
                  className="flex items-center gap-2.5 text-xs cursor-pointer group select-none"
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] transition-all ${
                      interactiveCheck
                        ? 'bg-[#191919] border-[#191919] text-white'
                        : 'border-[#64635e] group-hover:border-[#191919]'
                    }`}
                  >
                    {interactiveCheck && '✓'}
                  </div>
                  <span className={interactiveCheck ? 'line-through text-[#9a9994]' : 'font-medium text-[#191919]'}>
                    Persistent SQLite snapshotting and granular member permissions
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono">
                    Bob viewing
                  </span>
                </div>
              </div>

              {/* Callout Quote Block */}
              <div className="p-4 rounded-xl bg-[#f4f3ef] border border-[#e8e6e1] flex items-start gap-3 text-xs text-[#191919]">
                <Icons.Sparkles size={16} className="text-[#d95338] shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-[#191919]">Pure Convergence Guarantee</span>
                  <span className="text-[#64635e] leading-relaxed">
                    Every peer converges to the identical document order regardless of network latency, out-of-order delivery, or concurrent edits.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Storytelling Section */}
        <section id="features" className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20 border-t border-[#e8e6e1]">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#d95338]">
              Engineered for Serious Teams
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#191919] mt-2">
              Everything you need to write and collaborate
            </h2>
            <p className="text-sm text-[#64635e] mt-2 leading-relaxed">
              Designed around clarity, performance, and mathematical synchronization guarantees.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {/* Story 1: Real-Time Sync */}
            <div className="p-7 rounded-2xl bg-[#ffffff] border border-[#e8e6e1] shadow-card flex flex-col gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-[#f4f3ef] border border-[#e8e6e1] flex items-center justify-center text-[#191919]">
                <Icons.Zap size={20} />
              </div>
              <h3 className="text-base font-bold text-[#191919] tracking-tight">
                Real-Time Collaboration
              </h3>
              <p className="text-xs text-[#64635e] leading-relaxed">
                Keystrokes merge immediately across WebSockets with sub-10ms local responsiveness. Multiple writers can edit the same paragraph, list, or title simultaneously without locking or overwrite conflicts.
              </p>
            </div>

            {/* Story 2: Reliable Persistence */}
            <div className="p-7 rounded-2xl bg-[#ffffff] border border-[#e8e6e1] shadow-card flex flex-col gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-[#f4f3ef] border border-[#e8e6e1] flex items-center justify-center text-[#191919]">
                <Icons.Shield size={20} />
              </div>
              <h3 className="text-base font-bold text-[#191919] tracking-tight">
                Reliable Document Persistence
              </h3>
              <p className="text-xs text-[#64635e] leading-relaxed">
                Persistent project state is backed by SQLite snapshots and incremental operation logs. If network connectivity drops, changes queue locally and flush automatically upon reconnection.
              </p>
            </div>

            {/* Story 3: Clean Focused Editing */}
            <div className="p-7 rounded-2xl bg-[#ffffff] border border-[#e8e6e1] shadow-card flex flex-col gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-[#f4f3ef] border border-[#e8e6e1] flex items-center justify-center text-[#191919]">
                <Icons.Document size={20} />
              </div>
              <h3 className="text-base font-bold text-[#191919] tracking-tight">
                Clean Focused Editing
              </h3>
              <p className="text-xs text-[#64635e] leading-relaxed">
                Notion-style block structure supporting headings, interactive checklists, quotes, and markdown shortcuts. A distraction-free canvas that prioritizes readability and typography.
              </p>
            </div>

            {/* Story 4: Workspace Organization */}
            <div id="organization" className="p-7 rounded-2xl bg-[#ffffff] border border-[#e8e6e1] shadow-card flex flex-col gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-[#f4f3ef] border border-[#e8e6e1] flex items-center justify-center text-[#191919]">
                <Icons.Users size={20} />
              </div>
              <h3 className="text-base font-bold text-[#191919] tracking-tight">
                Workspace Organization
              </h3>
              <p className="text-xs text-[#64635e] leading-relaxed">
                Granular role-based access control (Owner, Editor, Viewer) enforced across both HTTP routes and WebSocket collaboration streams. Fast search and unified document management for teams.
              </p>
            </div>
          </div>
        </section>

        {/* Final Minimal CTA Banner */}
        <section className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center flex flex-col items-center gap-4 border-t border-[#e8e6e1]">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#9a9994]">
            Start in Seconds
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#191919]">
            Start writing together.
          </h2>
          <p className="text-sm text-[#64635e] max-w-md leading-relaxed">
            Create documents, invite teammates, and collaborate with pure mathematical convergence.
          </p>
          <div className="flex items-center gap-3 mt-2">
            <Link href="/dashboard">
              <Button variant="primary" size="lg" rightIcon={<Icons.ArrowRight size={14} />}>
                Open Workspace
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="lg">
                Sign In
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#e8e6e1] py-6 px-4 sm:px-6 text-center text-xs text-[#64635e]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Icons.Logo size={14} />
            <span className="font-semibold text-[#191919]">Braid</span>
            <span>— Conflict-Free Collaborative Document Editor</span>
          </div>
          <div className="font-mono text-[11px] text-[#9a9994]">Pure RGA CRDT • Lamport Clocks • Offline Queues</div>
        </div>
      </footer>
    </div>
  );
}
