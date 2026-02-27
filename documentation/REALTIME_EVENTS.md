# Zuvo Real-time Events (WebSockets) ⚡

Zuvo uses Socket.io for real-time communication, handled by the `Real-time Service`.

## Connection
**Endpoint**: `ws://localhost:5000` (Routed through Gateway)
**Authentication**: JWT must be provided in `handshake.auth.token` or as a query param `token`.

---

## 📤 Outbound Events (Client to Server)

| Event | Payload | Description |
| :--- | :--- | :--- |
| `chat:join` | `{ "conversationId": "string" }` | Join a conversation room |
| `chat:message` | `{ "conversationId": "string", "content": "string", "attachments": [] }` | Send a new message |
| `chat:typing` | `{ "conversationId": "string", "isTyping": boolean }` | Broadcast typing status |

---

## 📥 Inbound Events (Server to Client)

| Event | Payload | Description |
| :--- | :--- | :--- |
| `notification` | `{ userId, type, content }` | Real-time push notification (like, follow, etc.) |
| `chat:message` | `{ sender, content, timestamp, ... }` | New message received in a joined room |
| `chat:typing` | `{ userId, isTyping }` | A user in the room started/stopped typing |
| `error` | `{ message: string }` | Generalized error message |

---

## 🗄️ Internal Pub/Sub (Redis)
Services communicate with the Real-time service using the `notifications` Redis channel.
**Channel**: `notifications`
**Format**: `JSON.stringify({ userId, type, content })`
