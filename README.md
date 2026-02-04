# MyFuel API - Fleet Management Fuel Card Transaction System

A NestJS-based backend service for the Fast-Logic fleet management platform, providing fuel card transaction processing, organization balance management, and spending limit enforcement.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Getting Started](#getting-started)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Transaction Flow](#transaction-flow)
- [Testing](#testing)
- [Deployment](#deployment)
- [Design Decisions](#design-decisions)
- [Future Improvements](#future-improvements)

## 🎯 Overview

MyFuel is a digital fleet management platform that provides organizations with tools to control and monitor fuel expenses. The system supports:

- **Prepaid Balance Accounts**: Organizations maintain a prepaid balance from which all fuel transactions are deducted
- **Multi-Card Management**: Organizations can issue multiple fuel cards with individual limits
- **Spending Limits**: Daily and monthly spending limits per card with automatic reset
- **Real-time Validation**: Transaction validation checks organization balance and card limits
- **Audit Trail**: Complete ledger of all balance changes for compliance and reconciliation

## 🏗 Architecture

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Petrol Stations                               │
│                    (Transaction Webhooks)                            │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Load Balancer / API Gateway                     │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   API Pod 1     │ │   API Pod 2     │ │   API Pod N     │
│   (NestJS)      │ │   (NestJS)      │ │   (NestJS)      │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
      ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
      │   Redis     │ │  RabbitMQ   │ │ PostgreSQL  │
      │   (Cache)   │ │   (Queue)   │ │ (Database)  │
      └─────────────┘ └─────────────┘ └─────────────┘
```

### Transaction Processing Flow

```
Webhook Received
       │
       ▼
┌──────────────────┐
│ Verify Signature │ (Guard)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Check Idempotency│───Yes───▶ Return Cached Response
│   Key Exists?    │
└────────┬─────────┘
         │ No
         ▼
┌──────────────────┐
│ Store Webhook    │
│ Event (RECEIVED) │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────────────────────┐
│              BEGIN DATABASE TRANSACTION               │
├──────────────────────────────────────────────────────┤
│ 1. Validate Card (status, expiry)                    │
│    └─ FAIL → Decline: CARD_INACTIVE                  │
├──────────────────────────────────────────────────────┤
│ 2. Check Organization Balance                         │
│    - Lock row: SELECT ... FOR UPDATE                  │
│    - Check: available_balance >= amount               │
│    └─ FAIL → Decline: INSUFFICIENT_BALANCE           │
├──────────────────────────────────────────────────────┤
│ 3. Check Daily Limit                                  │
│    - Get/Create counter for today's date             │
│    - Check: spent + amount <= daily_limit            │
│    └─ FAIL → Decline: DAILY_LIMIT_EXCEEDED           │
├──────────────────────────────────────────────────────┤
│ 4. Check Monthly Limit                                │
│    - Get/Create counter for this month               │
│    - Check: spent + amount <= monthly_limit          │
│    └─ FAIL → Decline: MONTHLY_LIMIT_EXCEEDED         │
├──────────────────────────────────────────────────────┤
│ 5. APPROVE: Update all atomically                     │
│    - Deduct organization balance                      │
│    - Increment daily counter                          │
│    - Increment monthly counter                        │
│    - Create transaction record (APPROVED)             │
│    - Create balance ledger entry                      │
├──────────────────────────────────────────────────────┤
│              COMMIT TRANSACTION                       │
└──────────────────────────────────────────────────────┘
```

## ✨ Features

### Core Features
- **Organization Management**: Create and manage organizations with prepaid balance accounts
- **Card Management**: Issue fuel cards with configurable daily/monthly spending limits
- **Transaction Processing**: Real-time validation and processing of fuel transactions
- **Webhook Integration**: Secure webhook endpoint for petrol station integrations
- **Balance Ledger**: Complete audit trail of all balance changes

### Technical Features
- **Saga Orchestration Pattern**: Distributed transaction management with compensation
- **Redis Caching**: Performance optimization for card and organization lookups
- **RabbitMQ Integration**: Event-driven architecture for async processing
- **Idempotency Support**: Duplicate transaction prevention
- **API Documentation**: Swagger/OpenAPI documentation
- **Health Checks**: Kubernetes-ready health endpoints

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- RabbitMQ 3+ (optional, for message queue features)
- Docker & Docker Compose (optional, for containerized setup)

### Quick Start with Docker

```bash
# Clone the repository
git clone https://github.com/brm-stnd/tug_test.git
cd tug_test

# Start all services
docker-compose up -d

# The API will be available at http://localhost:3000
# Swagger docs at http://localhost:3000/api/docs
# RabbitMQ Management at http://localhost:15672 (guest/guest)
```

### Local Development Setup

```bash
# Navigate to the API directory
cd myfuel-api

# Copy environment file
cp .env.example .env

# Install dependencies
npm install

# Start PostgreSQL, Redis, RabbitMQ (using Docker)
docker-compose up -d postgres redis rabbitmq

# Run database migrations (auto-sync in development)
npm run start:dev

# The API will be available at http://localhost:3000
```

### Running Tests

```bash
# Unit tests
npm run test

# Unit tests with coverage
npm run test:cov

# E2E tests
npm run test:e2e

# Watch mode
npm run test:watch
```

## 📚 API Documentation

### Swagger UI

When the server is running, visit: `http://localhost:3000/api/docs`

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| **Organizations** | | |
| POST | `/organizations` | Create a new organization |
| GET | `/organizations` | List all organizations |
| GET | `/organizations/:id` | Get organization details |
| PUT | `/organizations/:id` | Update organization |
| GET | `/organizations/:id/balance` | Get balance details |
| POST | `/organizations/:id/balance/top-up` | Top up balance |
| GET | `/organizations/:id/ledger` | Get balance ledger |
| **Cards** | | |
| POST | `/cards` | Create a new card |
| GET | `/cards` | List all cards |
| GET | `/cards/:id` | Get card details |
| PUT | `/cards/:id` | Update card |
| GET | `/cards/:id/spending` | Get spending summary |
| **Transactions** | | |
| GET | `/transactions` | List transactions |
| GET | `/transactions/:id` | Get transaction details |
| **Webhooks** | | |
| POST | `/webhooks/transactions` | Process transaction webhook |
| GET | `/webhooks/events` | List webhook events |
| **Health** | | |
| GET | `/health` | Full health check |
| GET | `/health/live` | Liveness probe |
| GET | `/health/ready` | Readiness probe |

### Example: Process a Transaction

```bash
curl -X POST http://localhost:3000/webhooks/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "cardNumber": "1234567890123456",
    "amount": "50.00",
    "stationId": "STATION-001",
    "stationName": "Shell Main Street",
    "fuelType": "DIESEL",
    "liters": "45.5",
    "idempotencyKey": "unique-txn-id-123"
  }'
```

## 📁 Project Structure

```
myfuel-api/
├── src/
│   ├── cache/                    # Redis caching module
│   │   ├── cache.module.ts
│   │   └── cache.service.ts
│   │
│   ├── common/                   # Shared utilities
│   │   ├── dto/                  # Common DTOs
│   │   ├── filters/              # Exception filters
│   │   ├── guards/               # Auth guards
│   │   ├── interceptors/         # Logging, transform
│   │   └── utils/                # Helper functions
│   │
│   ├── config/                   # Configuration
│   │   ├── config.module.ts
│   │   └── configuration.ts
│   │
│   ├── database/                 # Database module
│   │   └── database.module.ts
│   │
│   ├── health/                   # Health checks
│   │   ├── health.controller.ts
│   │   └── health.module.ts
│   │
│   ├── messaging/                # RabbitMQ module
│   │   ├── constants/
│   │   ├── messaging.module.ts
│   │   └── rabbitmq.service.ts
│   │
│   ├── modules/
│   │   ├── cards/               # Card management
│   │   │   ├── dto/
│   │   │   ├── entities/
│   │   │   ├── cards.controller.ts
│   │   │   ├── cards.module.ts
│   │   │   └── cards.service.ts
│   │   │
│   │   ├── organizations/       # Organization management
│   │   │   ├── dto/
│   │   │   ├── entities/
│   │   │   ├── organizations.controller.ts
│   │   │   ├── organizations.module.ts
│   │   │   └── organizations.service.ts
│   │   │
│   │   ├── transactions/        # Transaction handling
│   │   │   ├── dto/
│   │   │   ├── entities/
│   │   │   ├── transactions.controller.ts
│   │   │   ├── transactions.module.ts
│   │   │   └── transactions.service.ts
│   │   │
│   │   └── webhooks/            # Webhook processing
│   │       ├── dto/
│   │       ├── entities/
│   │       ├── webhooks.controller.ts
│   │       ├── webhooks.module.ts
│   │       └── webhooks.service.ts
│   │
│   ├── saga/                    # Saga orchestration
│   │   ├── interfaces/
│   │   ├── sagas/
│   │   ├── saga.module.ts
│   │   └── saga-orchestrator.service.ts
│   │
│   ├── app.module.ts
│   └── main.ts
│
├── test/
│   └── app.e2e-spec.ts
│
├── .env.example
├── Dockerfile
├── package.json
└── tsconfig.json
```

## 🗄 Database Schema

### Entity Relationship Diagram

```
┌─────────────────────┐         ┌─────────────────────────┐
│   Organization      │         │   OrganizationBalance   │
├─────────────────────┤         ├─────────────────────────┤
│ id (PK)             │◄──1:1──►│ id (PK)                 │
│ name                │         │ organization_id (FK)    │
│ status              │         │ current_balance         │
│ timezone            │         │ reserved_balance        │
│ created_at          │         │ currency                │
│ updated_at          │         │ version (optimistic)    │
└─────────────────────┘         └─────────────────────────┘
         │                                  │
         │ 1:N                              │ 1:N
         ▼                                  ▼
┌─────────────────────┐         ┌─────────────────────────┐
│       Card          │         │    BalanceLedger        │
├─────────────────────┤         ├─────────────────────────┤
│ id (PK)             │         │ id (PK)                 │
│ organization_id(FK) │         │ organization_id (FK)    │
│ card_number         │         │ transaction_id (FK)     │
│ card_number_hash    │         │ entry_type              │
│ status              │         │ amount                  │
│ daily_limit         │         │ balance_before          │
│ monthly_limit       │         │ balance_after           │
│ holder_name         │         │ reference_type          │
│ expiry_date         │         │ reference_id            │
└─────────────────────┘         │ created_at              │
         │                      └─────────────────────────┘
         │ 1:N
         ▼
┌─────────────────────┐         ┌─────────────────────────┐
│ CardSpendingCounter │         │     Transaction         │
├─────────────────────┤         ├─────────────────────────┤
│ id (PK)             │         │ id (PK)                 │
│ card_id (FK)        │         │ idempotency_key (UQ)    │
│ period_type         │         │ organization_id (FK)    │
│ period_key          │◄──1:N───│ card_id (FK)            │
│ amount_spent        │         │ amount                  │
│ transaction_count   │         │ status                  │
│ version (optimistic)│         │ decline_reason          │
└─────────────────────┘         │ station_id              │
                                │ fuel_type               │
                                │ processed_at            │
                                └─────────────────────────┘
```

### Key Design Decisions

1. **Period-Keyed Counters**: Instead of resetting counters via cron jobs, we use period keys (e.g., `2026-02-03` for daily, `2026-02` for monthly). New periods automatically get new counter records.

2. **Balance Ledger (Event Sourcing)**: Every balance change creates an immutable ledger entry, enabling:
   - Full audit trail
   - Balance reconciliation
   - Point-in-time balance queries

3. **Card Number Hashing**: Card numbers are stored hashed for security, with only masked versions displayed.

4. **Optimistic Locking**: Version columns on frequently-updated entities prevent lost updates in concurrent scenarios.

## 🧪 Testing

### Test Coverage Goals

- Unit Tests: 80%+ coverage on services
- Integration Tests: Key API flows
- E2E Tests: Critical user journeys

### Running Tests

```bash
# All unit tests
npm run test

# With coverage report
npm run test:cov

# Specific test file
npm run test -- --testPathPattern=cards.service.spec.ts

# E2E tests (requires database)
npm run test:e2e
```

## 🚢 Deployment

### CI/CD Pipeline

The project includes a GitHub Actions workflow (`.github/workflows/ci.yml`) that:

1. **Lint**: ESLint and Prettier checks
2. **Test**: Unit and E2E tests with PostgreSQL, Redis, RabbitMQ service containers
3. **Build**: TypeScript compilation
4. **Docker**: Build and push image to GitHub Container Registry

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | HTTP server port | `3000` |
| `DATABASE_HOST` | PostgreSQL host | `localhost` |
| `DATABASE_PORT` | PostgreSQL port | `5432` |
| `DATABASE_USER` | PostgreSQL user | `postgres` |
| `DATABASE_PASSWORD` | PostgreSQL password | `postgres` |
| `DATABASE_NAME` | Database name | `myfuel` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `RABBITMQ_URL` | RabbitMQ connection URL | `amqp://guest:guest@localhost:5672` |
| `API_KEY` | API key for authentication | - |

## 🎨 Design Decisions

### Why Period-Keyed Counters?

Traditional approaches reset counters at midnight, requiring:
- Scheduled cron jobs
- Complex timezone handling
- Race condition handling during reset

Our approach uses period keys (`YYYY-MM-DD`, `YYYY-MM`):
- No reset jobs needed
- Natural historical data
- O(1) lookups
- Timezone-aware by design

### Why Saga Pattern for Transactions?

Transaction processing involves multiple steps that could fail:
1. Validate card
2. Check balance
3. Deduct balance
4. Update counters
5. Create transaction record

The Saga pattern provides:
- **Compensation logic**: Rollback completed steps on failure
- **Visibility**: Track which steps completed
- **Extensibility**: Add new steps without modifying core logic

### Why Webhook + Queue Architecture?

Instead of synchronous processing:
1. **Fast response**: Return 200 OK immediately after storing the webhook
2. **Reliability**: Retry failed processing from queue
3. **Scalability**: Multiple workers can process transactions in parallel

## 🔮 Future Improvements

### Short-term
- [ ] Weekly spending limits
- [ ] Vehicle-based limits
- [ ] Organization aggregate limits
- [ ] Transaction reversal/refund API

### Medium-term
- [ ] Real-time notifications (WebSocket)
- [ ] Reporting dashboard
- [ ] Bulk card issuance
- [ ] Multi-currency support

### Long-term
- [ ] Machine learning fraud detection
- [ ] Predictive balance alerts
- [ ] Integration with accounting systems
- [ ] Mobile app for drivers

## 📄 License

This project is part of a technical assessment and is not licensed for public use.

## 👤 Author

Technical Assessment - Fleet Management Platform
