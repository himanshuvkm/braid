'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { generateRoomId, setStoredUserName, setStoredRoomName, getStoredUserName } from '../lib/room-storage';

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');

  // Create Room state
  const [createRoomName, setCreateRoomName] = useState('');
  const [createUserName, setCreateUserName] = useState(() => getStoredUserName() || '');
  const [createErrors, setCreateErrors] = useState<{ roomName?: string; userName?: string }>({});

  // Join Room state
  const [joinRoomId, setJoinRoomId] = useState('');
  const [joinUserName, setJoinUserName] = useState(() => getStoredUserName() || '');
  const [joinErrors, setJoinErrors] = useState<{ roomId?: string; userName?: string }>({});

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { roomName?: string; userName?: string } = {};

    if (!createRoomName.trim()) {
      errors.roomName = 'Please enter a room name';
    }
    if (!createUserName.trim()) {
      errors.userName = 'Please enter your name';
    }

    if (Object.keys(errors).length > 0) {
      setCreateErrors(errors);
      return;
    }

    const roomId = generateRoomId();
    const roomName = createRoomName.trim();
    const userName = createUserName.trim();

    setStoredUserName(userName);
    setStoredRoomName(roomId, roomName);

    router.push(`/doc/${roomId}?name=${encodeURIComponent(roomName)}&user=${encodeURIComponent(userName)}`);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { roomId?: string; userName?: string } = {};

    let rawId = joinRoomId.trim();
    // Allow users to paste a full URL e.g. http://localhost:3000/doc/my-room
    if (rawId.includes('/doc/')) {
      rawId = rawId.split('/doc/')[1].split('?')[0].split('#')[0];
    }

    if (!rawId) {
      errors.roomId = 'Please enter a valid room ID or URL';
    }
    if (!joinUserName.trim()) {
      errors.userName = 'Please enter your name';
    }

    if (Object.keys(errors).length > 0) {
      setJoinErrors(errors);
      return;
    }

    const userName = joinUserName.trim();
    setStoredUserName(userName);

    router.push(`/doc/${encodeURIComponent(rawId)}?user=${encodeURIComponent(userName)}`);
  };

  return (
    <div className="min-h-screen bg-[#f4f4f5] text-[#000000] flex flex-col justify-between p-4 sm:p-6 lg:p-12">
      {/* Top Navbar */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between py-4 px-6 rounded-2xl bg-[#faf8f5] border border-[#e4e4e7] shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-xl font-black tracking-tight text-[#000000] hover:opacity-80 transition-opacity">
            Braid
          </Link>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#f8c8b8] text-[#000000] font-semibold">
            CRDT Collaborative Editor
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/doc/demo"
            className="text-xs font-semibold px-4 py-2 rounded-full bg-[#ececf0] text-[#000000] hover:bg-[#e4e4e7] transition-colors"
          >
            Live Demo Room →
          </Link>
        </div>
      </header>

      {/* Main Hero & Action Section */}
      <main className="w-full max-w-5xl mx-auto my-8 flex flex-col lg:flex-row gap-8 items-stretch">
        {/* Value Prop Banner */}
        <div className="flex-1 rounded-2xl bg-[#faf8f5] border border-[#e4e4e7] p-8 sm:p-10 shadow-sm flex flex-col justify-between gap-6">
          <div className="flex flex-col gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ececf0] w-fit text-xs font-semibold text-[#666666]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Conflict-Free Real-Time Collaboration
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-[#000000] leading-[1.08]">
              Collaborate in real time without merge conflicts.
            </h1>
            <p className="text-base text-[#666666] leading-relaxed">
              Braid is a pure Replicated Growable Array (RGA) CRDT editor. Multiple people can edit documents simultaneously with mathematically guaranteed convergence, causal delivery buffering, and offline resilience.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-[#ffffff] border border-[#e4e4e7]">
              <div className="text-xs font-bold text-[#000000]">Zero Conflicts</div>
              <div className="text-[11px] text-[#666666] mt-0.5">Deterministic Lamport clock ordering</div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#ffffff] border border-[#e4e4e7]">
              <div className="text-xs font-bold text-[#000000]">Offline Resilient</div>
              <div className="text-[11px] text-[#666666] mt-0.5">Queued ops sync automatically on reconnect</div>
            </div>
          </div>
        </div>

        {/* Interactive Room Action Bento Card */}
        <div className="w-full lg:w-[420px] rounded-2xl bg-[#faf8f5] border border-[#e4e4e7] p-6 sm:p-8 shadow-sm flex flex-col">
          {/* Action Tabs */}
          <div className="flex p-1 bg-[#ececf0] rounded-full mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab('create');
                setCreateErrors({});
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-full transition-all ${
                activeTab === 'create'
                  ? 'bg-[#000000] text-[#ffffff] shadow-sm'
                  : 'text-[#666666] hover:text-[#000000]'
              }`}
            >
              Create a Room
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('join');
                setJoinErrors({});
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-full transition-all ${
                activeTab === 'join'
                  ? 'bg-[#000000] text-[#ffffff] shadow-sm'
                  : 'text-[#666666] hover:text-[#000000]'
              }`}
            >
              Join a Room
            </button>
          </div>

          {/* Create Room Form */}
          {activeTab === 'create' ? (
            <form onSubmit={handleCreateRoom} className="flex-1 flex flex-col justify-between gap-4">
              <div className="flex flex-col gap-4">
                <div>
                  <label htmlFor="create-room-name" className="block text-xs font-bold text-[#000000] mb-1.5">
                    Room Name
                  </label>
                  <input
                    id="create-room-name"
                    type="text"
                    placeholder="e.g. Product Roadmap, Design Sprint"
                    value={createRoomName}
                    onChange={(e) => {
                      setCreateRoomName(e.target.value);
                      if (createErrors.roomName) setCreateErrors((prev) => ({ ...prev, roomName: undefined }));
                    }}
                    className={`w-full px-4 py-2.5 rounded-xl bg-[#ffffff] border text-sm text-[#000000] placeholder-[#666666]/50 outline-none transition-all ${
                      createErrors.roomName ? 'border-red-500 focus:ring-2 focus:ring-red-400/20' : 'border-[#e4e4e7] focus:border-[#000000]'
                    }`}
                  />
                  {createErrors.roomName && (
                    <p className="text-[11px] text-red-600 mt-1 font-medium">{createErrors.roomName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="create-user-name" className="block text-xs font-bold text-[#000000] mb-1.5">
                    Your Name
                  </label>
                  <input
                    id="create-user-name"
                    type="text"
                    placeholder="e.g. Alice, Himanshu"
                    value={createUserName}
                    onChange={(e) => {
                      setCreateUserName(e.target.value);
                      if (createErrors.userName) setCreateErrors((prev) => ({ ...prev, userName: undefined }));
                    }}
                    className={`w-full px-4 py-2.5 rounded-xl bg-[#ffffff] border text-sm text-[#000000] placeholder-[#666666]/50 outline-none transition-all ${
                      createErrors.userName ? 'border-red-500 focus:ring-2 focus:ring-red-400/20' : 'border-[#e4e4e7] focus:border-[#000000]'
                    }`}
                  />
                  {createErrors.userName && (
                    <p className="text-[11px] text-red-600 mt-1 font-medium">{createErrors.userName}</p>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-full bg-[#000000] text-[#ffffff] text-xs font-bold hover:opacity-90 active:scale-[0.99] transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  <span>Create Room</span>
                  <span>→</span>
                </button>
              </div>
            </form>
          ) : (
            /* Join Room Form */
            <form onSubmit={handleJoinRoom} className="flex-1 flex flex-col justify-between gap-4">
              <div className="flex flex-col gap-4">
                <div>
                  <label htmlFor="join-room-id" className="block text-xs font-bold text-[#000000] mb-1.5">
                    Room ID or URL
                  </label>
                  <input
                    id="join-room-id"
                    type="text"
                    placeholder="e.g. demo, doc-4k9z2a"
                    value={joinRoomId}
                    onChange={(e) => {
                      setJoinRoomId(e.target.value);
                      if (joinErrors.roomId) setJoinErrors((prev) => ({ ...prev, roomId: undefined }));
                    }}
                    className={`w-full px-4 py-2.5 rounded-xl bg-[#ffffff] border text-sm font-mono text-[#000000] placeholder-[#666666]/50 outline-none transition-all ${
                      joinErrors.roomId ? 'border-red-500 focus:ring-2 focus:ring-red-400/20' : 'border-[#e4e4e7] focus:border-[#000000]'
                    }`}
                  />
                  {joinErrors.roomId && (
                    <p className="text-[11px] text-red-600 mt-1 font-medium">{joinErrors.roomId}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="join-user-name" className="block text-xs font-bold text-[#000000] mb-1.5">
                    Your Name
                  </label>
                  <input
                    id="join-user-name"
                    type="text"
                    placeholder="e.g. Alice, Himanshu"
                    value={joinUserName}
                    onChange={(e) => {
                      setJoinUserName(e.target.value);
                      if (joinErrors.userName) setJoinErrors((prev) => ({ ...prev, userName: undefined }));
                    }}
                    className={`w-full px-4 py-2.5 rounded-xl bg-[#ffffff] border text-sm text-[#000000] placeholder-[#666666]/50 outline-none transition-all ${
                      joinErrors.userName ? 'border-red-500 focus:ring-2 focus:ring-red-400/20' : 'border-[#e4e4e7] focus:border-[#000000]'
                    }`}
                  />
                  {joinErrors.userName && (
                    <p className="text-[11px] text-red-600 mt-1 font-medium">{joinErrors.userName}</p>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-full bg-[#000000] text-[#ffffff] text-xs font-bold hover:opacity-90 active:scale-[0.99] transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  <span>Join Room</span>
                  <span>→</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* Feature Bento Cards */}
      <footer className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        <div className="rounded-2xl bg-[#faf8f5] border border-[#e4e4e7] p-6 shadow-sm flex flex-col gap-2">
          <div className="text-xs font-bold uppercase tracking-wider text-[#666666]">Engine</div>
          <div className="font-bold text-sm text-[#000000]">Pure RGA CRDT</div>
          <p className="text-xs text-[#666666] leading-relaxed">
            Deterministic sibling ordering by OpId tiebreak and causal tree traversal across all peer replicas.
          </p>
        </div>

        <div className="rounded-2xl bg-[#faf8f5] border border-[#e4e4e7] p-6 shadow-sm flex flex-col gap-2">
          <div className="text-xs font-bold uppercase tracking-wider text-[#666666]">Transport</div>
          <div className="font-bold text-sm text-[#000000]">WebSockets & Presence</div>
          <p className="text-xs text-[#666666] leading-relaxed">
            Real-time peer presence updates, instant op broadcast, and automatic offline queues.
          </p>
        </div>

        <div className="rounded-2xl bg-[#faf8f5] border border-[#e4e4e7] p-6 shadow-sm flex flex-col gap-2">
          <div className="text-xs font-bold uppercase tracking-wider text-[#666666]">Reliability</div>
          <div className="font-bold text-sm text-[#000000]">Causal Delivery Buffer</div>
          <p className="text-xs text-[#666666] leading-relaxed">
            Out-of-order remote operation buffering with exponential backoff reconnects and GC stability.
          </p>
        </div>
      </footer>
    </div>
  );
}
