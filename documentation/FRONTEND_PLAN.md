# Zuvo Frontend Plan & Architecture 🎨

This document outlines the detailed architecture and roadmap for the Zuvo Next.js frontend, crafted with a high-end **minimalist** aesthetic.

## 🛠️ Tech Stack & Design System
- **Framework**: Next.js 14+ (App Router)
- **Styling**: Minimalist Monochromatic Design System (Tailwind + Custom Tokens in `globals.css`)
- **Aesthetic**: Deep Obsidian (`#09090b`), Razor-thin hairline borders (`rgba(255,255,255,0.08)`), High-contrast typography, and zero visual clutter.
- **State Management**: React Context (Auth, Modals, Socket, Toast, Confirmation) + Optimistic UI
- **Real-time**: Socket.io-client
- **Data Fetching**: Axios with correlation tracing (`X-Request-ID`) and token rotation interceptors

---

## 📂 Page Structure & Features

### 1. Public / Auth Pages
- **`/login`**: Secure login with JWT handle. Google OAuth integration.
- **`/register`**: Multi-step registration (Account info -> Email verification trigger).
- **`/forgot-password`**: OTP request flow.
- **`/reset-password`**: OTP verification and password update.
- **`/verify-email`**: Landing page for email confirmation success.

### 2. Core Application (Protected)
- **`/(home)` (Feed)**:
    - Center: Personalized real-time feed with infinite scroll.
    - Right: Dynamic Sidebar (Trending Topics + Suggested Users).
    - Features: Optimistic Likes, Quick Comment, Share toggle.
- **`/explore`**:
    - Global search bar.
    - Categorized discovery (Technology, Lifestyle, Coding, etc.).
    - Grid view of trending media.
- **`/notifications`**:
    - Filtered views (All, Mentions, Likes, Follows).
    - Status indicators for unread alerts.
- **`/messages`**:
    - Left: Conversation list with last-message snippet and presence indicators.
    - Right: Active chat window with real-time bubble updates and typing indicators.
- **`/post/[id]`**:
    - Full-screen post view.
    - Threaded, nested comment section.
    - Media expansion (Lightbox).

### 3. User & Management
- **`/profile/[username]`**:
    - Header: Banner, Avatar, Bio, Follower/Following counts.
    - Tabs: Posts, Replies, Media, Likes.
    - Action: Message button / Follow toggle.
- **`/settings`**:
    - **Profile**: Edit display name, bio, website, location.
    - **Account**: Email update, password change.
    - **Sessions**: List active devices/locations with "Revoke All" capability.

---

## 🔄 Core Frontend Workflows

### 1. Authenticated Session Management
- **Workflow**:
    1. App checks `auth/me` on mount.
    2. If 401, attempts `auth/refresh-token`.
    3. If refresh successful, updates Access Token and retries original request.
    4. If fails, redirects to `/login`.

### 2. Content Creation Flow
- **Workflow**:
    1. User clicks "Post" -> Opens modal/page.
    2. User enters text -> Optional: Attach Media.
    3. If Media: Upload to `MediaService` -> Receive `publicId/url`.
    4. Send `BlogService` POST request with content and media references.
    5. Optimistically add post to the top of the feed.

### 3. Real-time Social Interaction
- **Workflow (Like)**:
    1. User clicks Heart -> UI immediately increments count and changes color.
    2. Background POST request to `InteractionsService`.
    3. If error: Revert UI state and show toast.

### 4. Real-time Message Receiving
- **Workflow**:
    1. Socket joins `user:[id]` room on auth.
    2. Event `chat:message` received -> 
        - If on `/messages/[convId]`: Append message to view.
        - If elsewhere: Show browser notification / UI badge.

---

## 📐 Responsive Layout Architecture
- **Mobile (< 1024px)**: Single-column feed (`max-w-xl mx-auto`). Top compact header (`h-16`) + Bottom navigation bar with safe-area insets. Left and right sidebars hidden.
- **Tablet / Small Laptop (1024px - 1279px)**: Two-column layout. Sticky left navigation sidebar (`w-56` or `w-60`) + Spacious central feed (`flex-1 max-w-2xl min-w-0`). Right sidebar hidden to avoid feed crampedness.
- **Desktop (>= 1280px)**: Three-column layout. Sticky left sidebar (`w-60`), Central feed (`max-w-[640px]`), and Sticky right discovery sidebar (`w-72 xl:w-80`). All three columns centered seamlessly inside `max-w-7xl mx-auto` with zero horizontal overflow or widescreen void.
- **Immersive Routes (`/shorts`)**: Dedicated full-height (`100dvh`) vertical reel player without navbar or sidebar interference.

---

## ✨ Premium UI/UX Details
- **Micro-interactions**: Hover effects on cards, pulse on like, smooth transitions between pages.
- **Loading States**: Skeleton loaders tailored to content shapes.
- **Responsiveness**: Mobile-first navigation (Bottom bar for mobile, Sidebar for desktop).
- **Zero-Latency Feel**: Extensive use of server-side data fetching for initial load + client-side updates.

