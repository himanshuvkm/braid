# Braid — Production Deployment Guide

This guide documents the architecture, configuration, and step-by-step instructions for deploying Braid to production with a real PostgreSQL database and dedicated WebSocket synchronization servers.

---

## 1. System Architecture Overview

Braid consists of two complementary services:

1. **Next.js Web Application (HTTP / SSR)**:
   - User authentication, project dashboards, document viewer SSR, REST APIs.
   - Connects to PostgreSQL via pooled connections (`pg`).
2. **SyncServer (Stateful WebSocket Relay)**:
   - Low-latency CRDT message broadcasting, presence tracking, and snapshot recovery.
   - Connects to PostgreSQL to authenticate sessions, verify project permissions, and load initial document snapshots.

```
       [ Client Browser ]
         /            \
  HTTPS /              \ WSS (WebSocket)
       v                v
[ Next.js Web App ]   [ Braid SyncServer ]
       \                /
        v              v
     [ PostgreSQL Database ]
```

---

## 2. PostgreSQL Setup

Braid requires PostgreSQL 14+ with SSL support.

### Recommended Managed Providers
* **Neon**: Serverless PostgreSQL with autoscaling and branching.
* **AWS RDS / Aurora PostgreSQL**: Enterprise high availability.
* **Supabase**: Managed Postgres with pooling.

### Connection String Format
```env
DATABASE_URL=postgresql://username:password@hostname:5432/braid?sslmode=require
```

### Self-Hosted PostgreSQL Quickstart
```bash
# Ubuntu / Debian
sudo apt update && sudo apt install -y postgresql postgresql-contrib
sudo -u postgres psql -c "CREATE DATABASE braid;"
sudo -u postgres psql -c "CREATE USER braid_user WITH ENCRYPTED PASSWORD 'secure_password_here';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE braid TO braid_user;"
```

---

## 3. Database Schema & Migrations

Braid includes automatic schema initialization when connecting to PostgreSQL.

### Canonical Schema (`lib/db/schema.sql`)
The schema enforces:
* Cascading foreign keys (`ON DELETE CASCADE`)
* Role-based access control constraint (`CHECK (role IN ('OWNER', 'EDITOR', 'VIEWER'))`)
* Unique membership constraint (`uq_project_member`)
* 64-bit timestamps (`BIGINT`) for millisecond epoch dates
* Performance indexes on session expiration, user IDs, and project memberships

### Manual Migration (Optional)
To pre-seed the database manually before application launch:
```bash
psql $DATABASE_URL -f lib/db/schema.sql
```

---

## 4. Next.js Deployment

### Option A: Vercel / Cloudflare Pages
1. Import repository to Vercel.
2. Set Environment Variables:
   * `NODE_ENV=production`
   * `DATABASE_URL=postgresql://...`
   * `NEXT_PUBLIC_WS_URL=wss://sync.yourdomain.com`
3. Deploy.

### Option B: Docker / Standalone Node.js Container
```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "run", "start"]
```

---

## 5. SyncServer Deployment (WebSocket Relay)

The SyncServer maintains active, stateful WebSocket connections. It should be deployed on a platform supporting persistent connections:
* **Fly.io / Railway / Render**: Excellent native WebSocket support.
* **AWS ECS / DigitalOcean App Platform**: Containerized long-lived tasks.

### SyncServer Startup Command
```bash
npm run sync-server
```
Runs `tsx sync-server/index.ts` on port `4444` (or configured `PORT`).

---

## 6. WebSocket TLS / WSS Configuration

Production WebSocket traffic must use `wss://` (TLS encrypted).

### Reverse Proxy Configuration (Nginx Example)
```nginx
server {
    server_name sync.yourdomain.com;
    listen 443 ssl http2;

    ssl_certificate /etc/letsencrypt/live/sync.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sync.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:4444;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket keepalive timeouts
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

### Caddy Example
```caddy
sync.yourdomain.com {
    reverse_proxy localhost:4444
}
```

---

## 7. Required Environment Variables

| Variable | Environment | Description | Example |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | All | Application environment | `production` |
| `DATABASE_URL` | Production | PostgreSQL connection string | `postgresql://user:pass@host:5432/braid` |
| `NEXT_PUBLIC_WS_URL` | Production | Public TLS WebSocket URL | `wss://sync.yourdomain.com` |
| `PORT` | Production | SyncServer listening port | `4444` |
| `BRAID_DB_MEMORY` | Testing | Use isolated SQLite memory DB | `true` (tests only) |

---

## 8. Health Checks & Monitoring

### Web Application Health Endpoint
* **URL**: `GET https://yourdomain.com/api/health`
* **Checks**: Web server status + PostgreSQL connection verification.
* **Success Response (200 OK)**:
  ```json
  {
    "status": "healthy",
    "service": "braid-app",
    "database": { "status": "connected", "type": "postgres" },
    "uptimeSeconds": 1420,
    "timestamp": 1725350000000
  }
  ```
* **Failure Response (503 Service Unavailable)**:
  ```json
  {
    "status": "unhealthy",
    "service": "braid-app",
    "database": { "status": "disconnected", "type": "postgres" },
    "error": "Database connectivity verification failed"
  }
  ```

### SyncServer Health Endpoint
* **URL**: `GET https://sync.yourdomain.com/health`
* **Success Response (200 OK)**:
  ```json
  {
    "status": "healthy",
    "service": "braid-sync-server",
    "rooms": 4,
    "connections": 12,
    "uptimeSeconds": 3600,
    "timestamp": 1725350000000
  }
  ```

---

## 9. Database Backups & Recovery

### Automated Backups
Schedule daily PostgreSQL logical backups via `pg_dump`:
```bash
pg_dump -Fc --no-acl --no-owner $DATABASE_URL > braid_backup_$(date +%Y%m%d).dump
```

### Point-in-Time Recovery (PITR)
Enable Write-Ahead Logging (WAL) archiving in production to recover document state to any point in time.

---

## 10. Local Development Setup

For local exploration without PostgreSQL, Braid defaults to embedded SQLite:

1. Clone and install dependencies:
   ```bash
   npm install
   ```
2. Copy environment template:
   ```bash
   cp .env.example .env.local
   ```
3. Start both development servers in separate terminals:
   ```bash
   # Terminal 1: Next.js Frontend & API
   npm run dev

   # Terminal 2: Real-time WebSocket Sync Server
   npm run sync-server
   ```
4. Open [http://localhost:3000](http://localhost:3000). Demo accounts (`Alice`, `Bob`, `Himanshu`) are pre-seeded automatically in development.
