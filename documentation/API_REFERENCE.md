# Zuvo API Reference 🚀

This document provides a comprehensive overview of the RESTful APIs exposed by the Zuvo microservices ecosystem, including request payloads and response structures.

## Base URL
All API requests are routed through the API Gateway:
`http://localhost:5000/api/v1`

## Response Format
Most endpoints return a standard JSON response:
```json
{
  "success": true,
  "data": { ... }, // Optional
  "message": "Success message" // Optional
}
```
---

## 📱 Feed Service
Personalized timeline aggregation.

### 1. Get Feed
`GET /feed?page=1&limit=20` (Auth Required)
- **Response (200)**: `{ "success": true, "data": [{ ...post }] }`

---

## 💬 Chat Service
Messaging and conversation management.

### 1. Get Conversations
`GET /chat/conversations?page=1&limit=20` (Auth Required)
- **Response (200)**:
  ```json
  {
    "success": true,
    "data": [{
      "id": "...",
      "participants": [{ "id": "...", "name": "...", "username": "...", "avatar": "..." }],
      "lastMessage": { ... },
      "isGroup": false,
      "updatedAt": "..."
    }]
  }
  ```

### 2. Get Messages
`GET /chat/messages/:conversationId?page=1&limit=50` (Auth Required)
- **Response (200)**:
  ```json
  {
    "success": true,
    "total": 120,
    "data": [{ "id": "...", "sender": { ...profile }, "content": "...", "createdAt": "..." }]
  }
  ```

### 3. Send Message
`POST /chat/message` (Auth Required)
- **Body**: `{ "conversationId": "...", "recipientId": "...", "content": "...", "attachments": [] }`
- **Response (201)**: `{ "success": true, "data": { ...message } }`

### 4. Create Group
`POST /chat/groups` (Auth Required)
- **Body**: `{ "name": "My Team", "participants": ["userId1", "userId2"] }`
- **Response (201)**: `{ "success": true, "data": { ...conversation } }`

---

## 🔐 Auth Service
Identity and profile management.

### 1. Register User
`POST /auth/register`
- **Body**:
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "username": "johndoe",
    "password": "Password123"
  }
  ```
- **Response (201)**: `{ "success": true, "message": "Check your email for verification link." }`

### 2. Login
`POST /auth/login`
- **Body**: `{ "email": "john@example.com", "password": "Password123" }`
- **Response (200)**:
  ```json
  {
    "success": true,
    "accessToken": "ey...",
    "user": { "id": "...", "name": "...", "username": "...", "email": "...", "role": "user" }
  }
  ```
- **Note**: Sets a `refreshToken` as an `httpOnly` secure cookie.

### 3. Update Profile
`PUT /auth/profile` (Auth Required)
- **Body**: `{ "name": "...", "bio": "...", "location": "...", "website": "...", "avatar": "...", "banner": "..." }`
- **Response (200)**: `{ "success": true, "data": { ...updatedUser } }`

---

## 📝 Blog Service
Content creation and management.

### 1. Create Post
`POST /blogs` (Auth Required)
- **Body**: `{ "title": "...", "content": "...", "tags": ["tag1"], "image": "..." }`
- **Response (201)**: `{ "success": true, "data": { ...post } }`

### 2. Get Posts
`GET /blogs?page=1&limit=10`
- **Response (200)**:
  ```json
  {
    "success": true,
    "count": 10,
    "total": 100,
    "page": 1,
    "pages": 10,
    "data": [{ ...post, author: { name, username, avatar } }]
  }
  ```

---

## ❤️ Interactions Service
Social engagement.

### 1. Toggle Like
`POST /interactions/like` (Auth Required)
- **Body**: `{ "postId": "...", "action": "like" }` // action: 'like' or 'dislike'
- **Response (200)**:
  ```json
  {
    "success": true,
    "data": { "likes": 42, "dislikes": 5 }
  }
  ```

### 2. Add Comment
`POST /interactions/comments` (Auth Required)
- **Body**: `{ "postId": "...", "content": "...", "parentCommentId": "..." }`
- **Response (201)**: `{ "success": true, "data": { ...comment } }`

---

## 🔍 Search Service
Discovery and trending.

### 1. Search
`GET /search?q=query&type=all&limit=10`
- **Types**: `posts`, `users`, `all`
- **Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "posts": [{ ... }],
      "users": [{ ... }]
    }
  }
  ```

### 2. Trending
`GET /search/trending`
- **Response (200)**: `{ "success": true, "data": [{ "id": "...", "tag": "...", "title": "...", "postsCount": 10 }] }`

---

## 🖼️ Media Service
File uploads.

### 1. Upload File
`POST /media/upload` (Auth Required)
- **Body**: `FormData` with a field named `file`.
- **Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "url": "https://...",
      "publicId": "zuvo/...",
      "resourceType": "image"
    }
  }
  ```
