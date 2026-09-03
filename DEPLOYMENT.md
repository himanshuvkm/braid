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

### Step E: Deploy SyncServer to a WebSocket-Capable Host
Deploy the standalone SyncServer to a platform supporting persistent connections:
* **Fly.io**: `fly launch` using Dockerfile or Node.js runtime.
* **Railway / Render**: Deploy as a Web Service running `npm run sync-server`.
* **VPS / Docker**: Run the container or process behind a reverse proxy.

**Start Command**:
```bash
npm run sync-server
```

### Step F: Configure SyncServer Environment Variables
In your SyncServer environment settings:
* `NODE_ENV`: `production`
* `PORT`: `4444` (or host-assigned port)
* `DATABASE_URL`: `postgresql://braid_user:secure_password@host:5432/braid?sslmode=require`
* `ALLOWED_ORIGINS`: `https://app.example.com`

### Step G: Configure DNS
Configure your DNS provider with two records:
* `app.example.com` → CNAME pointing to Vercel (`cname.vercel-dns.com`).
* `sync.example.com` → A/AAAA or CNAME pointing to your SyncServer host.

### Step H: Configure TLS / WSS Reverse Proxy
If running SyncServer behind Nginx or Caddy:

#### Nginx Example (`/etc/nginx/sites-available/sync.example.com`)
```nginx
server {
    server_name sync.example.com;
    listen 443 ssl http2;

    ssl_certificate /etc/letsencrypt/live/sync.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sync.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:4444;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Keepalive timeouts for persistent collaborative sessions
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

#### Caddy Example (`Caddyfile`)
```caddy
sync.example.com {
    reverse_proxy localhost:4444
}
```

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

### Standalone SyncServer
| Variable | Required | Example | Notes |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Yes | `production` | Enables production security checks |
| `PORT` | No | `4444` | Listening port (defaults to 4444) |
| `DATABASE_URL` | Yes | `postgresql://...` | Connection to PostgreSQL for session & project validation |
| `ALLOWED_ORIGINS` | Recommended | `https://app.example.com` | Restricts WebSocket upgrades to authorized web origin |

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
