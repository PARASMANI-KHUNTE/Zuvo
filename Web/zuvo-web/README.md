# Zuvo Web — Frontend

Enterprise-grade Next.js 14 frontend for the Zuvo platform.

## Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + CSS Variables
- **State**: Zustand (persisted)
- **Forms**: React Hook Form + Zod
- **HTTP**: Axios (with JWT interceptors + silent refresh)
- **Realtime**: Socket.IO Client
- **Language**: TypeScript (strict)

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Fill in NEXT_PUBLIC_API_URL and NEXT_PUBLIC_SOCKET_URL

# 3. Start the dev server
npm run dev
```

App runs at `http://localhost:3000`

## Folder Structure

```
app/
  (auth)/         → Login, Register, Forgot Password
  (dashboard)/    → Feed, Blog, Chat, Search, Profile
components/
  ui/             → Reusable primitives (Button, Input, Modal…)
  features/       → Feature-specific components
hooks/            → useAuth, useSocket, useDebounce…
lib/
  api.ts          → Axios instance with JWT interceptors
  socket.ts       → Socket.IO singleton client
  utils.ts        → cn, timeAgo, formatDate, getErrorMessage…
store/            → Zustand stores (auth, notifications)
types/            → Shared TypeScript types
styles/           → globals.css with design tokens
middleware.ts     → Route protection
```

## Git Workflow

```bash
git checkout main && git pull origin main
git checkout -b feature/your-task
# ... do work ...
git add . && git commit -m "feat: description"
git push origin feature/your-task
# Open PR → review → merge → delete branch
```

## Branch Naming

| Type      | Pattern                  |
|-----------|--------------------------|
| Feature   | `feature/login-page`     |
| Bug Fix   | `fix/navbar-overflow`    |
| UI        | `ui/dashboard-layout`    |
| Refactor  | `refactor/auth-hooks`    |
