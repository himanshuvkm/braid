# 🧶 Braid

<div align="center">

**A blazing-fast, conflict-free, real-time collaborative document & code editor powered by custom CRDTs.**

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-171%20Passed-brightgreen?style=flat-square&logo=vitest)](https://vitest.dev/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

[Features](#-key-features) • [Architecture](#-architecture) • [Getting Started](#-getting-started) • [Deployment](#-production-deployment) • [Documentation](#-project-structure)

</div>

---

## 🌟 Overview

**Braid** is a modern, high-performance collaborative workspace engineered from the ground up for seamless real-time co-authoring. At its core is a bespoke **Replicated Growable Array (RGA)** Conflict-Free Replicated Data Type (CRDT) engine with Lamport clock causality tracking, delivering sub-millisecond local latency, guaranteed convergence across distributed peers, and resilient offline-first editing.

Whether you're drafting technical specifications, pair-programming in multi-language code mode, or collaborating across remote teams, Braid provides a distraction-free, fluid editing experience with enterprise-grade security and multi-format export capabilities.

---

## ✨ Key Features

### ⚡ Custom CRDT Engine & Conflict-Free Sync
- **RGA (Replicated Growable Array)** algorithm ensuring deterministic convergence and zero data loss.
- **Lamport Timestamps & Causal Buffering** to correctly order concurrent operations and reconcile out-of-order network packets.
- **Tombstone Garbage Collection** to optimize memory footprint and maintain high performance across long sessions.
- **Offline Resiliency** with automatic reconnection backoff and seamless snapshot synchronization.

### 📝 Versatile Block Editor & Multi-Language Code Mode
- **Block-Based Rich Text Editor**: Headers (H1, H2, H3), lists, task checklists, blockquotes, callouts, and dividers.
- **Floating Format Toolbar & Slash Commands (`/`)** for instant block transformations and keyboard-first workflows.
- **Code Mode with 12+ Languages**: Syntax support for TypeScript, JavaScript, Python, Rust, Go, C++, Java, SQL, HTML, CSS, and JSON.
- **Live Document Outline**: Real-time Table of Contents tracking headings dynamically with click-to-scroll navigation.

### 👥 Real-Time Presence & Collaboration
- **Live Peer Cursors & Selection**: Color-coded, animated peer carets with user avatars and name tags.
- **Active Participant Roster**: Live visibility of active collaborators in the current room.
- **Instant Sharing & QR Codes**: One-click room invite link copying and live QR code generation for mobile onboarding.

### 📤 Multi-Format Document Export
- Export any document instantly to **PDF** (`.pdf`), **Microsoft Word** (`.docx`), **Markdown** (`.md`), **HTML** (`.html`), or **Plain Text** (`.txt`).
- High-fidelity formatting preservation across all export formats.

### 🔒 Enterprise Security & Role-Based Access Control (RBAC)
- **Role Permissions**: Granular `OWNER`, `EDITOR`, and `VIEWER` (read-only) enforcement on both HTTP and WebSocket levels.
- **HMAC-SHA256 Handshake Tokens**: Cryptographically signed short-lived tokens authorizing WebSocket connections.
- **Origin Validation & Rate Limiting**: Anti-impersonation, CORS origin checks, and request rate-limiting.
- **Flexible Authentication**: Support for authenticated user accounts, persistent sessions, and frictionless guest access.

### 💾 Dual Database Architecture
- **Development**: Zero-configuration embedded SQLite file storage (`.data/braid.db`).
- **Production**: Robust PostgreSQL support (Neon, Supabase, AWS RDS, Railway, Render) with automated, idempotent migration runner.

---

## 🏗️ Architecture

Braid decouples stateless HTTP/SSR application workloads from stateful real-time synchronization:

```mermaid
flowchart TD
    subgraph Clients["Collaborators"]
        A["Browser 1 (Editor / Owner)"]
        B["Browser 2 (Editor / Peer)"]
        C["Browser 3 (Viewer / Mobile)"]
    end

    subgraph AppServer["Next.js Web Application (Vercel / Node)"]
        D["App Router & UI Shell"]
        E["Auth & Session Management"]
        F["REST API & Project Endpoints"]
        G["Export Engine (PDF / DOCX / MD)"]
    end

    subgraph RealTimeSync["WebSocket Sync Server (Standalone Node.js)"]
        H["Connection Manager & Handshake Auth"]
        I["Room State & In-Memory CRDTs"]
        J["Operation Broadcaster & Presence"]
        K["Debounced Snapshot Persistence"]
    end

    subgraph Storage["Persistence Layer"]
        L[("PostgreSQL (Production) / SQLite (Dev)")]
    end

    A <-->|"HTTPS (SSR / Auth / API)"| AppServer
    B <-->|"HTTPS (SSR / Auth / API)"| AppServer
    C <-->|"HTTPS (SSR / Auth / API)"| AppServer

    A <-->|"WSS (CRDT Ops & Cursors)"| RealTimeSync
    B <-->|"WSS (CRDT Ops & Cursors)"| RealTimeSync
    C <-->|"WSS (CRDT Ops & Cursors)"| RealTimeSync

    AppServer <-->|"SQL Queries & Migrations"| Storage
    RealTimeSync <-->|"Snapshot Saves & Token Validation"| Storage
```

---

## 🛠️ Tech Stack

| Domain | Technologies |
| :--- | :--- |
| **Frontend** | [Next.js 16 (App Router)](https://nextjs.org/), [React 19](https://reactjs.org/), [Tailwind CSS v4](https://tailwindcss.com/), [TypeScript 5](https://www.typescriptlang.org/) |
| **CRDT & Sync** | Custom RGA Engine, Lamport Clocks, Causal Buffering, [ws (WebSocket)](https://github.com/websockets/ws) |
| **Backend & Storage** | Node.js, [PostgreSQL (`pg`)](https://node-postgres.com/), SQLite, Custom SQL Migrations |
| **Document Processing** | [PDFKit](https://pdfkit.org/), [docx](https://docx.js.org/), [qrcode](https://github.com/soldair/node-qrcode) |
| **Testing & Tooling** | [Vitest](https://vitest.dev/), ESLint 9, `tsx` |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.17.0 or higher
- **npm**, **pnpm**, or **yarn**

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/your-username/braid.git
cd braid
npm install
```

### 2. Environment Configuration

Create a local environment file by copying `.env.example`:

```bash
cp .env.example .env.local
```

For local development, default values work out of the box (uses SQLite at `.data/braid.db` and local WebSocket sync).

```env
NODE_ENV=development
PORT=4444
NEXT_PUBLIC_WS_URL=ws://localhost:4444
AUTH_SECRET=development-secret-key-32-chars-min
```

### 3. Run Development Servers

Braid consists of the Next.js web app and the standalone WebSocket sync server:

#### Terminal 1 — Next.js Application:
```bash
npm run dev
```
> Web application starts on [http://localhost:3000](http://localhost:3000).

#### Terminal 2 — WebSocket Sync Server:
```bash
npm run sync-server
```
> Real-time sync server runs on `ws://localhost:4444`.

---

## 📂 Project Structure

```
braid/
├── app/                      # Next.js App Router (pages, layouts, routes, APIs)
│   ├── [id]/                 # Direct document workspace page
│   ├── api/                  # REST APIs (auth, projects, ws-token, health)
│   ├── dashboard/            # Project management & document dashboard
│   ├── layout.tsx            # Root HTML layout & theme provider
│   └── page.tsx              # Minimal landing page & room join entry
├── components/               # React UI & Feature Components
│   ├── editor/               # Block editor, format toolbar, slash menu, outline
│   ├── layout/               # AppShell, header, sidebar, auth controls
│   ├── project/              # Project editor & workspace views
│   └── ui/                   # Reusable design system primitives (modals, dropdowns, etc.)
├── crdt-engine/              # Custom RGA CRDT implementation
│   ├── src/                  # RGA, Lamport clock, operations, tombstone GC
│   └── tests/                # CRDT convergence, causality, & GC unit tests
├── lib/                      # Shared business logic & server utilities
│   ├── db/                   # Database adapters (PostgreSQL, SQLite), migrations
│   ├── export/               # Export handlers (PDF, DOCX, Markdown, Text, HTML)
│   ├── auth.ts               # Session management & credential verification
│   ├── rate-limit.ts         # In-memory sliding window rate limiter
│   ├── sync-client.ts        # Client-side WebSocket sync manager & causal buffer
│   └── ws-token.ts           # HMAC-SHA256 WebSocket handshake token generation
├── sync-server/              # Standalone Node.js WebSocket synchronization server
│   ├── index.ts              # Sync server entrypoint
│   └── server.ts             # Room state management, client sessions & broadcasting
├── tests/                    # Vitest integration, security, & end-to-end test suite
└── benchmarks/               # Concurrent multi-editor CRDT performance benchmarks
```

---

## 🧪 Testing & Verification

Braid includes a comprehensive suite of 170+ automated tests covering CRDT convergence, cross-origin security, role permissions, rate limiting, and document export:

```bash
# Run all unit and integration tests
npm test

# Run TypeScript typecheck without emitting
npm run typecheck

# Run linter
npm run lint

# Run CRDT concurrency benchmark
npm run bench
```

---

## 🚢 Production Deployment

For complete, step-by-step production deployment instructions, please refer to the [**Deployment Guide**](DEPLOYMENT.md).

### High-Level Summary

1. **Database**: Provision a PostgreSQL database (e.g. Neon, Supabase, AWS RDS) and run:
   ```bash
   DATABASE_URL="postgresql://user:pass@host:5432/braid?sslmode=require" npm run db:migrate
   ```
2. **Sync Server**: Deploy `sync-server/index.ts` to a persistent Node.js host (Railway, Fly.io, Render, or VPS) with:
   - `PORT=4444`
   - `DATABASE_URL=postgresql://...`
   - `AUTH_SECRET=your-production-secret`
   - `ALLOWED_ORIGINS=https://your-app-domain.com`
3. **Next.js Web App**: Deploy to [Vercel](https://vercel.com) with:
   - `DATABASE_URL=postgresql://...`
   - `AUTH_SECRET=your-production-secret`
   - `NEXT_PUBLIC_WS_URL=wss://your-sync-server-domain.com`

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
