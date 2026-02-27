# Zuvo Frontend Plan & Architecture 🎨

This document outlines the detailed plan for the Zuvo Next.js frontend, including page structures, workflows, and technical strategies.

## 🛠️ Tech Stack
- **Framework**: Next.js 14+ (App Router)
- **Styling**: Vanilla CSS (Premium Custom Design System)
- **State Management**: React Context (Auth) + Optimistic UI (Zustand or local state)
- **Real-time**: Socket.io-client
- **Data Fetching**: Axios / Fetch with interceptors for JWT rotation

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

## ✨ Premium UI/UX Details
- **Micro-interactions**: Hover effects on cards, pulse on like, smooth transitions between pages.
- **Loading States**: Skeleton loaders tailored to content shapes.
- **Responsiveness**: Mobile-first navigation (Bottom bar for mobile, Sidebar for desktop).
- **Zero-Latency Feel**: Extensive use of server-side data fetching for initial load + client-side updates.
