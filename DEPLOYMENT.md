# Braid — Production Deployment Guide

This guide documents the architecture, configuration, and exact deployment sequence for launching Braid in production with **Next.js on Vercel**, a **PostgreSQL database**, and a standalone **WebSocket Sync Server**.

---

## 1. Production Architecture Overview

Braid separates stateless HTTP requests from stateful real-time collaboration:

```
                          [ Client Browser ]
                            /            \
       HTTPS (REST / SSR)  /              \  WSS (Real-time CRDT Relay)
                          v                v
            [ Next.js on Vercel ]    [ Braid SyncServer ]
            (app.example.com)        (sync.example.com)
                          \                /
                           v              v
                        [ PostgreSQL Database ]
```

* **Next.js Web Application (`app.example.com`)**: Deployed on Vercel Serverless. Handles SSR, authentication, dashboards, and REST API.
* **SyncServer (`sync.example.com`)**: Long-lived Node.js process hosted on a WebSocket-capable host (Fly.io, Railway, Render, or VPS). Handles real-time CRDT synchronization, presence, and authorization.
* **PostgreSQL**: Central persistence layer shared by both the Next.js app and the SyncServer.

---

## 2. Step-by-Step Production Deployment Sequence

### Step A: Provision PostgreSQL
Provision a PostgreSQL 14+ database instance from any provider (e.g. Neon, AWS RDS, Supabase, or self-hosted).
Ensure SSL is enabled (`sslmode=require`).

Save your connection string:
```env
DATABASE_URL=postgresql://braid_user:secure_password@ep-cool-db.us-east-1.aws.neon.tech/braid?sslmode=require
```

### Step B: Run Migrations
Run the migration script to establish the `schema_migrations` tracking table and canonical schema:
```bash
DATABASE_URL="postgresql://..." npm run db:migrate
```
*Migrations are idempotent and safe to execute repeatedly.*

### Step C: Deploy Next.js to Vercel
1. Push your repository to GitHub / GitLab.
2. In Vercel dashboard, click **Add New Project** and import the repository.
3. Keep default build settings:
   * **Framework Preset**: Next.js
   * **Build Command**: `next build`
   * **Output Directory**: `.next`

### Step D: Configure Vercel Environment Variables
In **Project Settings → Environment Variables**, add:
* `NODE_ENV`: `production`
* `DATABASE_URL`: `postgresql://braid_user:secure_password@host:5432/braid?sslmode=require`
* `NEXT_PUBLIC_WS_URL`: `wss://sync.example.com`

Deploy the project.

### Step E: Deploy SyncServer to Render

Deploy the standalone SyncServer as a **Web Service** on [Render](https://render.com):

1. In the Render Dashboard, click **New +** → **Web Service**.
2. Connect your repository: `himanshuvkm/braid`.
3. Configure the service settings:
   * **Name**: `braid-sync-server` (or preferred name)
   * **Region**: Select a region close to your PostgreSQL database
   * **Branch**: `main`
   * **Root Directory**: *(leave blank for repository root)* — **Do NOT set to `/sync-server`** because the sync server imports shared types and CRDT logic from the repository root.
   * **Runtime**: `Node`
   * **Build Command**: `npm install && npm run build:sync-server`
   * **Start Command**: `npm run start:sync-server`
4. Under **Advanced Settings**:
   * **Health Check Path**: `/health` (Render will query `GET /health` and expect HTTP 200 OK)

### Step F: Configure SyncServer Environment Variables on Render

In your Render service dashboard under **Environment Variables**, add:

| Key | Value | Purpose |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enforces production security, origin validation, and error masking |
| `DATABASE_URL` | `postgresql://braid_user:secure_password@host:5432/braid?sslmode=require` | Pooled connection to PostgreSQL for session and project authorization |
| `ALLOWED_ORIGINS` | `https://<web-app-domain>` | Restricts WebSocket upgrades to your web app's origin (e.g. `https://braid.vercel.app` or `https://app.example.com`) |

> [!IMPORTANT]
> * **Port Handling**: Render automatically injects the `PORT` environment variable. SyncServer dynamically listens on `0.0.0.0:$PORT` to bind to all interfaces. Do NOT hardcode or manually set `PORT=4444` in Render.
> * **Separation of Variables**: Do NOT define `NEXT_PUBLIC_WS_URL` in Render. That variable is evaluated at client build time and belongs exclusively to the Next.js/Vercel deployment.

Render will provision a public TLS endpoint:
```
https://<render-service>.onrender.com
wss://<render-service>.onrender.com
```

### Step G: Configure Vercel with Render's WebSocket URL
In Vercel **Project Settings → Environment Variables**, configure:
* `NEXT_PUBLIC_WS_URL`: `wss://<render-service>.onrender.com` (or your custom domain `wss://sync.example.com`)

### Step H: Configure Custom Domains & TLS (Optional)
If using custom domains:
* `app.example.com` → CNAME to Vercel (`cname.vercel-dns.com`).
* `sync.example.com` → CNAME to `<render-service>.onrender.com` in Render's Custom Domains dashboard. Render provisions and renews TLS certificates automatically for WSS connections.

### Step I: Verify Health Checks
1. **Next.js Web App Health**:
   ```bash
   curl -i https://app.example.com/api/health
   ```
   Must return `200 OK` with JSON:
   ```json
   {
     "status": "healthy",
     "service": "braid-app",
     "database": { "status": "connected", "type": "postgres" },
     "uptimeSeconds": 45
   }
   ```
2. **SyncServer Health**:
   ```bash
   curl -i https://sync.example.com/health
   ```
   Must return `200 OK` with JSON:
   ```json
   {
     "status": "healthy",
     "service": "braid-sync-server",
     "rooms": 0,
     "connections": 0
   }
   ```

### Step J: Verify Authentication
1. Navigate to `https://app.example.com/login`.
2. Register a new user account. Verify that `braid_session` cookie is set with `HttpOnly`, `Secure`, `SameSite=Lax`.
3. Log out. Verify that the session is deleted from PostgreSQL `sessions` table.

### Step K: Verify Real-Time Collaboration
1. Log in with User 1 and create a document.
2. In another device or browser, log in with User 2 and open the document.
3. Verify that the status pill shows `✓ Synced`.
4. Type simultaneously in both browsers; verify real-time cursor presence and character synchronization.

### Step L: Verify Persistence & Server Restart Recovery
1. Type a paragraph in the collaborative document.
2. Restart the SyncServer process (`kill -TERM <pid>` then restart).
3. Verify:
   * Clients temporarily display `Reconnecting to Braid sync server...`.
   * Clients automatically reconnect and transition back to `✓ Synced`.
   * No edits are lost.
   * Reload the page from `https://app.example.com/project/[id]`; verify full document snapshot loads from PostgreSQL.

---

## 3. Environment Variables Reference

### Next.js on Vercel
| Variable | Required | Example | Notes |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Yes | `production` | Enables production cookie flags & security headers |
| `DATABASE_URL` | Yes | `postgresql://...` | Pooled connection to PostgreSQL |
| `NEXT_PUBLIC_WS_URL` | Yes | `wss://sync.example.com` | Public TLS WebSocket URL for browser sync client |

### Standalone SyncServer (Render)
| Variable | Required | Example | Notes |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Yes | `production` | Enables production security checks and origin enforcement |
| `DATABASE_URL` | Yes | `postgresql://...` | Connection to PostgreSQL for session & project validation |
| `ALLOWED_ORIGINS` | Yes | `https://braid.vercel.app` | Restricts WebSocket upgrades to authorized web app origin |
| `PORT` | Auto (Render) | `10000` | Injected automatically by Render (defaults to 4444 locally) |

---

## 4. Local Development Quickstart

For local development without PostgreSQL, Braid defaults to embedded SQLite:

```bash
# 1. Install dependencies
npm install

# 2. Start Next.js App
npm run dev

# 3. Start SyncServer (in a separate terminal)
npm run sync-server
```
App is available at `http://localhost:3000`. Demo accounts (`Alice`, `Bob`, `Himanshu`) are pre-seeded in SQLite development mode.
