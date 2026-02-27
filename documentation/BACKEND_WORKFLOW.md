# Zuvo Backend Architecture & Workflow 🏗️

Zuvo is built on a high-scale, resilient microservices architecture. This document explains how the backend services interact and handle data.

## 🏛️ Architecture Overview
The system uses a **Decoupled Microservices** pattern with an **API Gateway** as the single entry point.

### 1. API Gateway (Entry Point)
- **Routing**: Proxies request to downstream services based on URL prefix (`/api/v1/auth`, etc.).
- **Security**: Implements Helmet, CORS, and standardizes Request tracing.
- **WS Upgrade**: Handles WebSocket upgrades and routes them to the `Real-time Service`.

### 2. Identity & Access (Auth Service)
- **JWT Strategy**: Uses Dual-token system (Short-lived Access Token + Long-lived Refresh Token in HttpOnly cookie).
- **Rotation**: Refresh tokens are rotated on every use to prevent replay attacks.
- **RBAC**: Role-Based Access Control determines resource permissions.

---

## 🔄 Core Workflows

### 1. Post Creation & Distribution (Fan-out)
When a user creates a post:
1.  **Blog Service** saves the post to MongoDB (marked as `published`).
2.  **Blog Service** publishes a `POST_CREATE` event to Redis Streams (`zuvo_tasks`).
3.  **Worker Service** picks up the task:
    - **Search Indexing**: Adds the post to the Search service's index.
    - **Feed Fan-out**: Identifies followers and pushes the post ID to their personalized Redis feeds.
    - **Media Processing**: If media is attached, triggers background compression.

### 2. Social Interactions & Real-time Alerts
When a user likes a post or follows someone:
1.  **Interactions Service** updates counters in Redis (for speed) and saves the relationship/comment in MongoDB.
2.  **Interactions Service** publishes a `NOTIFICATION` task to Redis.
3.  **Worker Service** processes the task and publishes to the `notifications` Redis channel.
4.  **Real-time Service** (Socket.io) listens to the channel and emits a WebSocket event to the specific recipient.

### 3. Messaging & Chat
- **Synchronous Persistence**: Messages are saved via HTTP or WebSocket.
- **Background Persistence**: The worker ensures every message is safely stored even during high load using the `SAVE_CHAT_MESSAGE` task.

---

## 🛡️ Resilience & Scaling
- **Circuit Breakers**: Shared utilities prevent cascading failures if a service (like Media) goes down.
- **Dead Letter Queues (DLQ)**: Failed background tasks are moved to `zuvo_dlq` for manual recovery.
- **Statelessness**: All services are stateless (sessions in Redis/JWT), allowing easy horizontal scaling.

## 🔭 Observability
- **Distributed Tracing**: Every request is tagged with a `traceId` visible in Jaeger.
- **Centralized Logging**: Structured Winston logs show service-specific context.
- **Metrics**: Prometheus metrics available for tracking latency and success rates.
