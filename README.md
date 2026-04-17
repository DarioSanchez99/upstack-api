# Upstack API

> Upstack is an API monitoring SaaS. It continuously checks your HTTP endpoints on configurable intervals, tracks uptime and response time, sends email alerts when endpoints go down or recover, and provides a public status page per workspace.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Upstack API (Node.js)                    │
│                                                                 │
│  ┌──────────┐   ┌────────────┐   ┌─────────────────────────┐  │
│  │  Express │   │  BullMQ    │   │  node-cron Scheduler    │  │
│  │  REST API│   │  Worker    │◄──│  (every 1 min)          │  │
│  └────┬─────┘   └─────┬──────┘   └─────────────────────────┘  │
│       │               │                                         │
│       ▼               ▼                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Prisma ORM                             │   │
│  └──────────────────────┬──────────────────────────────────┘   │
│                         │                                        │
└─────────────────────────┼────────────────────────────────────────┘
                          │
          ┌───────────────┼──────────────────┐
          ▼               ▼                  ▼
   ┌────────────┐  ┌────────────┐   ┌──────────────┐
   │ PostgreSQL │  │   Redis    │   │   External   │
   │  (Prisma) │  │ (BullMQ)  │   │  HTTP APIs   │
   └────────────┘  └────────────┘   └──────────────┘
          │
          ▼
   ┌──────────────────────────────┐
   │   Integrations               │
   │   - Resend (email alerts)    │
   │   - Stripe (billing)         │
   └──────────────────────────────┘
```

---

## Tech Stack

| Layer          | Technology                        | Purpose                              |
|----------------|-----------------------------------|--------------------------------------|
| Runtime        | Node.js 20                        | JavaScript runtime                   |
| Framework      | Express 4                         | HTTP server & routing                |
| ORM            | Prisma 5                          | Database access & migrations         |
| Database       | PostgreSQL 15                     | Primary data store                   |
| Queue          | BullMQ 5 + IORedis                | Job queue for concurrent checks      |
| Scheduler      | node-cron                         | Cron-based job dispatcher            |
| Auth           | jsonwebtoken + bcryptjs           | JWT authentication                   |
| Email          | Resend                            | Transactional alert emails           |
| Billing        | Stripe                            | Subscription management              |
| Validation     | Zod                               | Request schema validation            |
| Security       | helmet + cors + express-rate-limit| HTTP hardening                       |
| HTTP Client    | axios                             | Outbound endpoint checks             |
| Containerization | Docker Compose                  | Local dev environment                |
| Deployment     | Fly.io                            | Production hosting                   |

---

## Prerequisites

- **Node.js 20+** — [nodejs.org](https://nodejs.org)
- **Docker Desktop** — [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
- **npm 10+** (bundled with Node.js 20)
- A **Resend** account for email alerts — [resend.com](https://resend.com)
- A **Stripe** account for billing — [stripe.com](https://stripe.com)

---

## Local Development Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-org/upstack-api.git
cd upstack-api
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in all required values (see [Environment Variables](#environment-variables) below).

### 3. Start local infrastructure (PostgreSQL + Redis + pgAdmin)

```bash
docker compose up -d
```

Services started:
- PostgreSQL 15 on `localhost:5432`
- Redis 7 on `localhost:6379`
- pgAdmin on `http://localhost:5050` (admin@upstack.io / admin)

### 4. Install dependencies

```bash
npm install
```

### 5. Run database migrations

```bash
npx prisma migrate dev --name init
```

This creates all tables defined in `prisma/schema.prisma`.

### 6. (Optional) Seed the database

```bash
npm run db:seed
```

### 7. Start the development server

```bash
npm run dev
```

The API is now available at `http://localhost:3000`.

### Useful development commands

```bash
npm run db:studio      # Open Prisma Studio (visual DB browser)
npm run db:generate    # Regenerate Prisma client after schema changes
npm run db:migrate     # Run pending migrations
```

---

## Environment Variables

| Variable                | Required | Default                     | Description                                         |
|-------------------------|----------|-----------------------------|-----------------------------------------------------|
| `NODE_ENV`              | No       | `development`               | Runtime environment                                 |
| `PORT`                  | No       | `3000`                      | HTTP server port                                    |
| `DATABASE_URL`          | Yes      | —                           | PostgreSQL connection string                        |
| `REDIS_URL`             | Yes      | —                           | Redis connection URL                                |
| `JWT_SECRET`            | Yes      | —                           | Secret for signing JWTs (min 16 chars)              |
| `JWT_EXPIRES_IN`        | No       | `7d`                        | JWT expiry duration                                 |
| `RESEND_API_KEY`        | Yes      | —                           | Resend API key for sending emails                   |
| `RESEND_FROM_EMAIL`     | No       | `alerts@upstack.io`         | Sender email address                                |
| `STRIPE_SECRET_KEY`     | Yes      | —                           | Stripe secret key (`sk_test_…` or `sk_live_…`)      |
| `STRIPE_WEBHOOK_SECRET` | Yes      | —                           | Stripe webhook signing secret (`whsec_…`)           |
| `STRIPE_PRO_PRICE_ID`   | Yes      | —                           | Stripe Price ID for the PRO plan                    |
| `FRONTEND_URL`          | No       | `http://localhost:5173`     | Frontend origin (used for CORS and redirect URLs)   |
| `CHECK_ENGINE_ENABLED`  | No       | `true`                      | Set to `false` to disable the check scheduler       |
| `MAX_CONCURRENT_CHECKS` | No       | `5`                         | BullMQ worker concurrency for simultaneous checks   |

---

## API Endpoints

### Authentication — `/api/auth`

| Method | Path              | Auth | Description                          |
|--------|-------------------|------|--------------------------------------|
| POST   | `/api/auth/register` | No  | Create a new account + workspace     |
| POST   | `/api/auth/login`    | No  | Login and receive a JWT token        |
| GET    | `/api/auth/me`       | Yes | Get the authenticated user's profile |

**Register body:**
```json
{ "email": "you@example.com", "password": "min8chars", "name": "Your Name" }
```

**Login response:**
```json
{ "token": "eyJ...", "user": { "id": "...", "email": "...", "plan": "FREE" } }
```

---

### Monitors — `/api/monitors`

All routes require `Authorization: Bearer <token>`.

| Method | Path                  | Description                          |
|--------|-----------------------|--------------------------------------|
| GET    | `/api/monitors`       | List all monitors in user's workspace |
| GET    | `/api/monitors/:id`   | Get a single monitor                 |
| POST   | `/api/monitors`       | Create a new monitor                 |
| PATCH  | `/api/monitors/:id`   | Update a monitor                     |
| DELETE | `/api/monitors/:id`   | Delete a monitor                     |

**Create monitor body:**
```json
{
  "name": "My API",
  "url": "https://api.example.com/health",
  "method": "GET",
  "intervalMins": 5,
  "timeoutSecs": 30,
  "expectedStatus": 200,
  "headers": { "X-API-Key": "secret" }
}
```

**Plan limits:** FREE plan is limited to **3 monitors**. Upgrade to PRO for unlimited.

---

### Check Results — `/api/monitors/:id`

| Method | Path                          | Description                              |
|--------|-------------------------------|------------------------------------------|
| GET    | `/api/monitors/:id/results`   | Paginated check history (`?page=1&limit=50`) |
| GET    | `/api/monitors/:id/stats`     | Uptime % (7d, 30d) and avg response time |

---

### Billing — `/api/billing`

| Method | Path                        | Auth | Description                             |
|--------|-----------------------------|------|-----------------------------------------|
| POST   | `/api/billing/create-checkout` | Yes | Create Stripe Checkout session (→ PRO) |
| POST   | `/api/billing/portal`       | Yes  | Open Stripe Customer Portal            |
| POST   | `/api/billing/webhook`      | No   | Stripe webhook receiver                |
| GET    | `/api/billing/subscription` | Yes  | Get current plan info                  |

---

### Public Status Page — `/api/status`

| Method | Path                  | Auth | Description                              |
|--------|-----------------------|------|------------------------------------------|
| GET    | `/api/status/:slug`   | No   | Public status page for a workspace slug  |

---

### Health Check

| Method | Path          | Description              |
|--------|---------------|--------------------------|
| GET    | `/api/health` | Returns `{ status: "ok" }` |

---

## Database Schema

```
User
 ├── id (uuid)
 ├── email (unique)
 ├── passwordHash
 ├── name
 ├── plan (FREE | PRO)
 ├── stripeCustomerId
 └── workspaces → Workspace[]

Workspace
 ├── id (uuid)
 ├── userId → User
 ├── name
 ├── slug (unique, used for status page URL)
 └── monitors → Monitor[]

Monitor
 ├── id (uuid)
 ├── workspaceId → Workspace
 ├── name, url, method
 ├── headers (JSON), body
 ├── intervalMins, timeoutSecs, expectedStatus
 ├── isActive, status (UP|DOWN|DEGRADED|PENDING)
 ├── lastChecked, nextCheck
 └── checkResults → CheckResult[]

CheckResult
 ├── id (uuid)
 ├── monitorId → Monitor
 ├── status (UP|DOWN|DEGRADED)
 ├── statusCode, responseTimeMs
 ├── errorMessage
 └── checkedAt

AlertLog
 ├── id (uuid)
 ├── monitorId → Monitor
 ├── type (DOWN|RECOVERED)
 ├── sentTo
 └── sentAt
```

---

## Check Engine

The Check Engine is the core of Upstack. It works in two layers:

### 1. Scheduler (node-cron)

A cron job runs **every minute** and queries the database for monitors where:
- `isActive = true`
- `nextCheck <= NOW()`

Each due monitor is enqueued as a BullMQ job.

### 2. Worker (BullMQ)

A BullMQ Worker processes jobs with configurable concurrency (`MAX_CONCURRENT_CHECKS`). For each job:

1. Sends an HTTP request using the monitor's configuration (method, headers, body, timeout)
2. Measures `responseTimeMs`
3. Determines status:
   - **UP**: correct status code + response time < timeout
   - **DEGRADED**: correct status code but slow (>50% of timeout)
   - **DOWN**: wrong status code, timeout, or connection error
4. Saves a `CheckResult` record
5. Updates monitor's `status`, `lastChecked`, and `nextCheck`
6. Triggers alerts if status changed (DOWN or RECOVERED)

### Alert anti-spam

- **DOWN alert**: only sent after **2 consecutive DOWN results** (avoids flapping alerts)
- **RECOVERED alert**: only sent when transitioning from DOWN → UP

---

## Folder Structure

```
upstack-api/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── app.js                 # Express app setup
│   ├── server.js              # Server entry point + graceful shutdown
│   ├── config/
│   │   ├── database.js        # Prisma client singleton
│   │   ├── env.js             # Zod env validation
│   │   └── redis.js           # IORedis connection
│   ├── middleware/
│   │   ├── auth.js            # JWT verification middleware
│   │   ├── errorHandler.js    # Global error handler
│   │   └── rateLimiter.js     # express-rate-limit config
│   └── modules/
│       ├── auth/              # Registration, login, JWT
│       ├── monitors/          # Monitor CRUD
│       ├── checks/            # Check results & stats
│       ├── scheduler/         # Cron + BullMQ + HTTP runner
│       ├── alerts/            # Email alerts (Resend)
│       ├── billing/           # Stripe integration
│       └── status/            # Public status page
├── .env.example               # Environment variable template
├── .gitignore
├── docker-compose.yml         # PostgreSQL + Redis + pgAdmin
├── Dockerfile                 # Multi-stage production build
├── fly.toml                   # Fly.io deployment config
└── package.json
```

---

## Deploy to Fly.io

### Prerequisites

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
fly auth login
```

### First-time deploy

```bash
# Create the app
fly launch --name upstack-api --no-deploy

# Provision a managed PostgreSQL database
fly postgres create --name upstack-db
fly postgres attach upstack-db

# Provision a managed Redis instance
fly redis create --name upstack-redis
# Set REDIS_URL secret with the connection string shown

# Set all required secrets
fly secrets set \
  JWT_SECRET="your-production-secret-min-32-chars" \
  RESEND_API_KEY="re_your_key" \
  RESEND_FROM_EMAIL="alerts@upstack.io" \
  STRIPE_SECRET_KEY="sk_live_your_key" \
  STRIPE_WEBHOOK_SECRET="whsec_your_secret" \
  STRIPE_PRO_PRICE_ID="price_your_id" \
  FRONTEND_URL="https://app.upstack.io"

# Deploy
fly deploy
```

### Subsequent deploys

```bash
fly deploy
```

Migrations run automatically via the `release_command` in `fly.toml`.

### Useful Fly.io commands

```bash
fly status              # Check app status
fly logs                # Stream live logs
fly ssh console         # SSH into the machine
fly scale count 2       # Scale to 2 machines
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make your changes with tests
4. Commit following Conventional Commits: `feat:`, `fix:`, `chore:`, etc.
5. Push and open a Pull Request

Please ensure your code:
- Passes `npm run lint` (if configured)
- Does not introduce breaking changes to existing API contracts
- Includes appropriate error handling

---

## License

MIT
