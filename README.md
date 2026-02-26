# Zuvo 🚀

**Zuvo** is a production-grade, high-scale distributed microservices platform for blogging and social engagement. 

Built with a focus on **Resilience**, **Observability**, and **Enterprise Security**, Zuvo demonstrates modern distributed systems architecture patterns.

## 🏗️ Architecture Architecture
The system is composed of 8+ specialized microservices communicating via a mix of synchronous REST/WebSocket and asynchronous Redis Streams.

### Core Services:
- **API Gateway**: Unified entry point with zero-trust security and WS upgrade logic.
- **Auth Service**: Production-grade identity management with JWT rotation and RBAC.
- **Blog Service**: SEO-optimized content engine with soft-deletion and automated audit logging.
- **Media Service**: Cloud-native media processing (Cloudinary + FFmpeg).
- **Interactions Service**: High-performance social engagement (Redis atomic counters).
- **Real-time Service**: Scalable WebSocket backbone for push notifications.
- **Worker Service**: Background task processor with DLQ and OTel tracing.
- **Feed & Search**: Read-optimized services for timeline aggregation and indexing.

## 🛡️ Enterprise Hardening
- **Distributed Tracing**: Full OpenTelemetry (OTel) instrumentation across all services.
- **Security**: Global NoSQL injection & XSS protection + Joi schema validation.
- **Data Governance**: RGPD-compliant data scrubbing and detailed audit trails.
- **Resilience**: Circuit breakers, exponential backoff, and dead-letter queues.

## 🚀 Getting Started

### Prerequisites:
- Node.js (v18+)
- Docker & Docker Compose
- Redis & MongoDB

### Setup:
1. **Clone the repository**:
   ```bash
   git clone https://github.com/parasmani-khunte/zuvo.git
   cd zuvo
   ```

2. **Install Dependencies**:
   ```bash
   cd backend
   npm install
   ```

3. **Environment setup**:
   - Copy `.env.example` to `.env` in each service directory (Auth, Blog, etc.).

4. **Run with Docker**:
   ```bash
   docker-compose up --build
   ```

## 🔭 Observability
- **Metrics**: Access `http://localhost:5000/metrics` for Prometheus.
- **Tracing**: Open Jaeger UI at `http://localhost:16686` to visualize distributed traces.

---
*Created with ❤️ by Parasmani Khunte*
