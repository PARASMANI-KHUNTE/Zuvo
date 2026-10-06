# Zuvo — Production Deployment Guide

A comprehensive, production-grade deployment guide for both the **Next.js Frontend** and the **Microservices Backend** (API Gateway, 9 Microservices, Redis Stream Workers, MongoDB, and Socket.io Realtime Server).

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites & External Services](#2-prerequisites--external-services)
3. [Environment Variables Matrix](#3-environment-variables-matrix)
4. [Deployment Option A: Docker Compose on VPS (Recommended)](#4-deployment-option-a-docker-compose-on-vps-recommended)
   - [Server Preparation](#41-server-preparation)
   - [Environment Configuration](#42-environment-configuration)
   - [Nginx & Let's Encrypt SSL](#43-nginx--lets-encrypt-ssl)
   - [Running the Services](#44-running-the-services)
   - [Systemd Auto-Restart](#45-systemd-auto-restart)
5. [Deployment Option B: Managed Cloud (Vercel + Railway/Render + Atlas)](#5-deployment-option-b-managed-cloud-vercel--railwayrender--atlas)
   - [Frontend on Vercel](#51-frontend-on-vercel)
   - [Backend on Railway / Render](#52-backend-on-railway--render)
   - [Database on MongoDB Atlas](#53-database-on-mongodb-atlas)
   - [Cache & Queue on Redis Cloud](#54-cache--queue-on-redis-cloud)
6. [Database Seeding & Migrations](#6-database-seeding--migrations)
7. [SSL, DNS & Domain Setup](#7-ssl-dns--domain-setup)
8. [Monitoring, Health Checks & Logs](#8-monitoring-health-checks--logs)
9. [Automated Backups](#9-automated-backups)
10. [Troubleshooting & Common Pitfalls](#10-troubleshooting--common-pitfalls)

---

## 1. Architecture Overview

```
                                  Internet
                                     │
                                     ▼
                    ┌─────────────────────────────────┐
                    │     Nginx / Cloudflare CDN      │
                    │      Port 80 / 443 (SSL)        │
                    └───────────────┬─────────────────┘
                                    │
               ┌────────────────────┴────────────────────┐
               │                                         │
        / (Web UI)                        /api/* and /socket.io/*
               │                                         │
               ▼                                         ▼
    ┌─────────────────────┐                   ┌─────────────────────┐
    │ Next.js Frontend    │                   │   API Gateway       │
    │ Container (Port 3000)                   │ Container (Port 5000│
    └─────────────────────┘                   └──────────┬──────────┘
                                                         │
         ┌──────────────┬──────────────┬─────────────────┼──────────────┬──────────────┐
         ▼              ▼              ▼                 ▼              ▼              ▼
     ┌───────┐      ┌───────┐      ┌───────┐         ┌───────┐      ┌───────┐      ┌───────┐
     │ Auth  │      │ Blog  │      │ Inter-│         │ Real- │      │ Feed  │      │ Search│
     │ :8000 │      │ :8001 │      │actions│         │ time  │      │ :8005 │      │ :8006 │
     └───────┘      └───────┘      │ :8002 │         │ :8004 │      └───────┘      └───────┘
                                   └───────┘         └───────┘
         ┌──────────────┬──────────────┴─────────────────┼──────────────┐
         ▼              ▼                                ▼              ▼
     ┌───────┐      ┌───────┐                       ┌─────────┐    ┌─────────┐
     │ Media │      │ Chat  │                       │ MongoDB │    │  Redis  │
     │ :8003 │      │ :8007 │                       │ (Data)  │    │ (Broker/│
     └───────┘      └───────┘                       │  :27017 │    │  Cache) │
         │                                          └─────────┘    │  :6379  │
         │ (Stream tasks)                                          └─────────┘
         ▼                                                              ▲
     ┌───────────────────────┐                                          │
     │     Worker Pool       │──────────────────────────────────────────┘
     │ (Feed fanout, index)  │
     └───────────────────────┘
```

### Component Breakdown

| Component | Port | Description |
| :--- | :---: | :--- |
| **Frontend** | `3000` | Next.js 14 App Router client |
| **API Gateway** | `5000` | Central entrypoint, routing, security, Socket.io proxy |
| **Auth Service** | `8000` | User auth, JWT issuance, Google OAuth, user profiles |
| **Blog Service** | `8001` | Post creation, slug generation, Markdown articles |
| **Interactions** | `8002` | Likes, comments, threaded replies, follow relationships |
| **Media Service** | `8003` | Cloudinary uploads for images, video reels, audio |
| **Realtime Service** | `8004` | Socket.io server, push notifications relay |
| **Feed Service** | `8005` | Pre-computed Redis feeds & fallback timeline generation |
| **Search Service** | `8006` | Post/user search, trending topics aggregation |
| **Chat Service** | `8007` | Direct messaging, conversations, read receipts |
| **Worker Service** | Background | Redis Streams consumer for feed fanout and notifications |
| **MongoDB** | `27017` | Primary database (`Zuvo`) |
| **Redis** | `6379` | Stream queue (`zuvo_tasks`), Pub/Sub, feed caches |

---

## 2. Prerequisites & External Services

Before deploying, ensure you have credentials for the following services:

1. **Server / VPS**:
   - Minimum: 2 vCPU, 4GB RAM (e.g., DigitalOcean Basic $24/mo, Hetzner CX22 €4/mo, AWS t3.medium).
   - Ubuntu 22.04 LTS or 24.04 LTS.
2. **Domain Name**:
   - A registered domain (e.g., `example.com`).
   - DNS access to point `A` records to your server IP.
3. **Cloudinary Account**:
   - Required for media/image/video uploads.
   - Get `Cloud Name`, `API Key`, and `API Secret` from [Cloudinary Console](https://cloudinary.com/console).
4. **Google Cloud Console (Optional, for Google Login)**:
   - Create an OAuth 2.0 Web Client ID in [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
   - Set Authorized Redirect URI: `https://yourdomain.com/api/v1/auth/google/callback`.
5. **SMTP Mail Provider (Optional, for password resets)**:
   - Gmail App Password or SendGrid / Resend / Amazon SES credentials.

---

## 3. Environment Variables Matrix

Create a `.env` file from [.env.production.example](file:///f:/Codes/Projects/Advance%20Backend/Zuvo/.env.production.example):

### Frontend Variables

| Variable | Description | Example |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Full base URL to Gateway API v1 | `https://yourdomain.com/api/v1` |
| `NEXT_PUBLIC_REALTIME_URL` | Base URL for WebSocket connections | `https://yourdomain.com` |

### Gateway & Backend Variables

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `GATEWAY_PORT` | Port for the API Gateway | `5000` |
| `CORS_ORIGIN` | Allowed client origin for CORS | `https://yourdomain.com` |
| `DB_NAME` | MongoDB database name | `Zuvo` |
| `MONGODB_URI` | MongoDB connection URI | `mongodb://mongodb:27017/Zuvo` |
| `REDIS_URL` | Redis connection URI | `redis://redis:6379` |
| `JWT_SECRET` | Primary JWT signing key | Random 64-character hex |
| `ACCESS_TOKEN_SECRET` | Secret for short-lived access tokens | Random 64-character hex |
| `REFRESH_TOKEN_SECRET` | Secret for long-lived refresh tokens | Random 64-character hex |
| `ACCESS_TOKEN_EXPIRY` | Access token lifespan | `15m` |
| `REFRESH_TOKEN_EXPIRY` | Refresh token lifespan | `7d` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account name | `my-cloud` |
| `CLOUDINARY_API_KEY` | Cloudinary API key | `123456789012345` |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | `abcdef123456...` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `*.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | `GOCSPX-...` |
| `GOOGLE_CALLBACK_URL` | OAuth redirect endpoint | `https://yourdomain.com/api/v1/auth/google/callback` |
| `SMTP_HOST` | Outgoing email server | `smtp.gmail.com` |
| `SMTP_PORT` | Outgoing email port | `587` |
| `SMTP_USER` | Email username | `you@gmail.com` |
| `SMTP_PASS` | Email password or app password | `xxxx xxxx xxxx xxxx` |
| `EMAIL_FROM` | Sender display name & address | `Zuvo <noreply@yourdomain.com>` |

---

## 4. Deployment Option A: Docker Compose on VPS (Recommended)

This strategy runs all services, databases, and Nginx on a single cloud server using the included [docker-compose.prod.yml](file:///f:/Codes/Projects/Advance%20Backend/Zuvo/docker-compose.prod.yml).

### 4.1 Server Preparation

SSH into your freshly created Ubuntu 22.04/24.04 VPS:

```bash
# Update OS packages
sudo apt update && sudo apt upgrade -y

# Install Docker & Docker Compose plugin
sudo apt install -y ca-certificates curl gnupg lsb-release
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin git ufw

# Configure Firewall
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

### 4.2 Clone Code & Configure Environment

```bash
# Clone your repository
git clone https://github.com/your-username/zuvo.git /opt/zuvo
cd /opt/zuvo

# Create production environment file
cp .env.production.example .env
nano .env
```

Fill in your actual values:
- `DOMAIN=yourdomain.com`
- `CORS_ORIGIN=https://yourdomain.com`
- `NEXT_PUBLIC_API_URL=https://yourdomain.com/api/v1`
- `NEXT_PUBLIC_REALTIME_URL=https://yourdomain.com`
- Strong JWT secrets (generate with `openssl rand -hex 32`)
- Cloudinary credentials

### 4.3 Setup SSL with Let's Encrypt Certbot

Before configuring Nginx for HTTPS, generate your SSL certificate:

```bash
# Install Certbot standalone
sudo apt install -y certbot

# Request certificate (replace yourdomain.com with your real domain)
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
```

Now update [nginx/nginx.conf](file:///f:/Codes/Projects/Advance%20Backend/Zuvo/nginx/nginx.conf) to listen on port 443 with your SSL certificate:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 50M;

    # Gateway API
    location /api/ {
        proxy_pass http://gateway:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    # WebSocket Proxy (Socket.io)
    location /socket.io/ {
        proxy_pass http://gateway:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # Frontend UI
    location / {
        proxy_pass http://frontend:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

Mount `/etc/letsencrypt` into the nginx service in `docker-compose.prod.yml`:
```yaml
  nginx:
    image: nginx:1.25-alpine
    container_name: zuvo-nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - frontend
      - gateway
```

### 4.4 Build and Run All Services

```bash
# Build and launch all 13 containers in detached mode
sudo docker compose -f docker-compose.prod.yml up -d --build

# Verify container health
sudo docker compose -f docker-compose.prod.yml ps
```

All containers should report `Up` or `Up (healthy)`.

### 4.5 Systemd Auto-Restart on Server Reboot

Create a systemd unit file to ensure the application starts automatically on boot:

```bash
sudo nano /etc/systemd/system/zuvo.service
```

Paste the following:

```ini
[Unit]
Description=Zuvo Application Stack
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/zuvo
ExecStart=/usr/bin/docker compose -f docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.prod.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

Enable and test:

```bash
sudo systemctl daemon-reload
sudo systemctl enable zuvo
```

---

## 5. Deployment Option B: Managed Cloud (Vercel + Railway/Render + Atlas)

For serverless scaling and zero infrastructure management, split the deployment:

### 5.1 Frontend on Vercel

1. Push your code to GitHub.
2. Sign in to [Vercel](https://vercel.com) and click **"Add New Project"**.
3. Select your repository.
4. Set the **Root Directory** to `Web`.
5. Set the Framework Preset to **Next.js**.
6. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_API_URL` = `https://api.yourdomain.com/api/v1`
   - `NEXT_PUBLIC_REALTIME_URL` = `https://api.yourdomain.com`
7. Click **Deploy**.
8. Assign your custom domain (e.g. `yourdomain.com`) in the Vercel Project Settings.

### 5.2 Database on MongoDB Atlas

1. Create a free M0 or production M10+ cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Under **Network Access**, add the IP addresses of your backend hosts (or `0.0.0.0/0` with strong authentication).
3. Under **Database Access**, create a user `zuvo_admin`.
4. Grab your connection string:
   `mongodb+srv://zuvo_admin:<password>@cluster0.abcde.mongodb.net/Zuvo?retryWrites=true&w=majority`

### 5.3 Cache & Queue on Redis Cloud / Upstash

1. Create a Redis database on [Redis Cloud](https://redis.io/cloud/) or [Upstash](https://upstash.com).
   *(Note: Ensure the Redis instance supports Streams `XADD`/`XREADGROUP` and Pub/Sub).*
2. Copy your connection URL: `rediss://default:<password>@your-endpoint.redis.com:6379`.

### 5.4 Backend on Railway or Render

1. On [Railway](https://railway.app), create a new project from your GitHub repository.
2. Deploy the backend services using the respective Dockerfiles (`backend/gateway/Dockerfile`, `backend/services/*/Dockerfile`).
3. Set the shared environment variables across services (`MONGODB_URI`, `REDIS_URL`, `JWT_SECRET`, `CLOUDINARY_*`).
4. Expose the `gateway` service on a custom domain (e.g., `api.yourdomain.com`).
5. Ensure `CORS_ORIGIN` in the backend matches your Vercel frontend domain (`https://yourdomain.com`).

---

## 6. Database Seeding & Migrations

Once your production MongoDB is online, populate initial dummy data or create your first admin user:

### Run Seeder in Production Container

```bash
# If using Docker Compose:
sudo docker compose -f docker-compose.prod.yml exec auth node /app/scripts/seed.js

# Or from your local machine connected to the production DB:
MONGODB_URI="mongodb://user:pass@host:27017/Zuvo" node backend/scripts/seed.js
```

This populates 6 distinct accounts, 12 rich posts with images and videos, initial likes, threaded comments, and notifications.

---

## 7. SSL, DNS & Domain Setup

Configure the following DNS records at your domain registrar (Cloudflare, Namecheap, GoDaddy):

| Type | Host | Points To | Notes |
| :---: | :---: | :---: | :---: |
| **A** | `@` | `YOUR_SERVER_IP` | Directs apex domain to VPS |
| **A** | `www` | `YOUR_SERVER_IP` | Directs www subdomain |
| **A** | `api` (optional) | `YOUR_SERVER_IP` | If using `api.yourdomain.com` for Gateway |

### Automatic SSL Certificate Renewal

Let's Encrypt certificates expire every 90 days. Setup a cron job for automatic renewal:

```bash
# Add renewal hook to crontab
sudo crontab -e

# Add this line to run daily at 3:00 AM:
0 3 * * * certbot renew --quiet --deploy-hook "docker compose -f /opt/zuvo/docker-compose.prod.yml exec nginx nginx -s reload"
```

---

## 8. Monitoring, Health Checks & Logs

### Viewing Real-Time Logs

```bash
# View all logs live
sudo docker compose -f docker-compose.prod.yml logs -f

# View specific service logs
sudo docker compose -f docker-compose.prod.yml logs -f gateway
sudo docker compose -f docker-compose.prod.yml logs -f realtime
sudo docker compose -f docker-compose.prod.yml logs -f worker
```

### Health Check Endpoints

Every service in the cluster exposes `/health` and `/ready` endpoints:

| Endpoint | Purpose | Expected Response |
| :--- | :--- | :--- |
| `GET https://yourdomain.com/api/v1/health` | Gateway Liveness | `200 OK {"status": "UP"}` |
| `GET https://yourdomain.com/api/v1/ready` | Dependency Readiness | `200 OK {"status": "UP", "dependencies": {...}}` |
| `GET http://localhost:5000/metrics` | Prometheus Metrics | `200 OK` (OpenMetrics format) |

---

## 9. Automated Backups

### Automated Daily MongoDB Backup

Create a backup script `/opt/zuvo/scripts/backup-db.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/opt/zuvo/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"

# Dump Zuvo database from container
docker exec zuvo-mongodb mongodump --db Zuvo --out /tmp/dump
docker cp zuvo-mongodb:/tmp/dump/Zuvo "$BACKUP_DIR/zuvo_$TIMESTAMP"
docker exec zuvo-mongodb rm -rf /tmp/dump

# Compress backup
tar -czf "$BACKUP_DIR/zuvo_$TIMESTAMP.tar.gz" -C "$BACKUP_DIR" "zuvo_$TIMESTAMP"
rm -rf "$BACKUP_DIR/zuvo_$TIMESTAMP"

# Retain only last 14 days of backups
find "$BACKUP_DIR" -type f -name "*.tar.gz" -mtime +14 -exec rm {} +

echo "Backup completed: $BACKUP_DIR/zuvo_$TIMESTAMP.tar.gz"
```

Make it executable and add to crontab:

```bash
chmod +x /opt/zuvo/scripts/backup-db.sh
sudo crontab -e

# Run every night at 2:00 AM
0 2 * * * /opt/zuvo/scripts/backup-db.sh >> /var/log/zuvo-backup.log 2>&1
```

---

## 10. Troubleshooting & Common Pitfalls

### 1. `CORS Error: Origin not allowed`
- **Cause**: `CORS_ORIGIN` in backend `.env` does not match the frontend URL.
- **Fix**: Verify `CORS_ORIGIN=https://yourdomain.com` matches your browser URL exactly (including `https://` and without trailing slash).

### 2. `WebSocket connection to ws://... failed`
- **Cause**: Nginx is missing `Upgrade` headers, or the client is using `ws://` instead of `wss://`.
- **Fix**:
  1. Ensure `NEXT_PUBLIC_REALTIME_URL=https://yourdomain.com`.
  2. In `nginx.conf`, ensure `proxy_set_header Upgrade $http_upgrade;` and `proxy_set_header Connection "upgrade";` are present under `location /socket.io/`.

### 3. `502 Bad Gateway` from API Gateway
- **Cause**: One of the internal microservices (e.g., `auth:8000`, `blog:8001`) is down or crashed on startup.
- **Fix**: Check `docker compose -f docker-compose.prod.yml ps` and inspect error logs with `docker compose -f docker-compose.prod.yml logs <service-name>`.

### 4. Media Upload Fails (`413 Request Entity Too Large`)
- **Cause**: Default Nginx client body size limit is 1MB.
- **Fix**: Ensure `client_max_body_size 50M;` is present in your Nginx configuration.

### 5. Google OAuth `redirect_uri_mismatch`
- **Cause**: The authorized redirect URI registered in Google Console does not match `GOOGLE_CALLBACK_URL`.
- **Fix**: Add `https://yourdomain.com/api/v1/auth/google/callback` to the Authorized Redirect URIs in Google Cloud Console.
