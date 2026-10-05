# MKK AI Agent Backend

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.2-lightgrey.svg)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7.10-blueviolet.svg)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-336791.svg)](https://www.postgresql.org/)
[![Google Gen AI SDK](https://img.shields.io/badge/Google_Gen_AI-2.24-4285F4.svg)](https://www.npmjs.com/package/@google/genai)

A robust, enterprise-ready TypeScript backend API for the MKK AI Agent platform. Built on **Express.js v5**, **Prisma ORM**, **PostgreSQL**, and integrated with **Google Gemini SDK (`@google/genai`)**, this server handles authentication, session management, user token encryption, real-time AI conversation streaming, and administrative operations.

---

## 🌟 Key Features

- 🤖 **Google Gemini AI Integration**
  - Real-time SSE/stream content generation (`/generate-stream-content` and `/retry-stream-content`).
  - Dynamic discovery and database seeding of available Gemini models.
  - Per-user encrypted API key support with fallback to default environment credentials.
- 🔐 **Authentication & Security**
  - JWT Access & Refresh Token strategy with HTTP-Only cookies.
  - User registration, login, logout, email verification, and password reset workflows.
  - Secure password hashing using `bcrypt`.
  - AES payload/token encryption for sensitive data (`ENCRYPTION_KEY`).
  - Security HTTP headers via `helmet`, strict `cors` origins, and API rate limiting via `express-rate-limit`.
- 💬 **Conversation & Chat Management**
  - Full CRUD operations for user conversations and conversation messages.
  - Message pagination and history management.
  - Context retention across streaming responses.
- 👥 **User Management & Roles**
  - Role-based authorization (`USER` vs `ADMIN`).
  - Account profile updates and password changes.
  - Admin endpoints for user listing and profile management.
- 🗄️ **Database & Schema Management**
  - Modern modular Prisma schema architecture supporting PostgreSQL.
  - Database seeding scripts for initial admin setup and Gemini model catalog fetching.
- 🧪 **Testing & Quality Control**
  - Integration and unit test suite built with **Jest** and **Supertest**.
  - ESLint and Prettier for code consistency.

---

## 🛠️ Tech Stack

| Domain                       | Technology                                                                       |
| :--------------------------- | :------------------------------------------------------------------------------- |
| **Language & Runtime** | Node.js, TypeScript                                                              |
| **Framework**          | Express.js 5.2                                                                   |
| **Database & ORM**     | PostgreSQL, Prisma 7.10                                                          |
| **AI SDK**             | `@google/genai` (Google Gen AI SDK)                                            |
| **Auth & Security**    | JWT (`jsonwebtoken`), `bcrypt`, `helmet`, `express-rate-limit`, `cors` |
| **Validation**         | Zod                                                                              |
| **Mailer**             | Nodemailer                                                                       |
| **Logging**            | Winston, Morgan                                                                  |
| **Testing**            | Jest, Supertest, ts-jest                                                         |

---

## 📁 Directory Structure

```text
backend/
├── prisma/
│   ├── models/                # Modular Prisma schema models
│   │   ├── apiTokens.prisma
│   │   ├── conversationMessages.prisma
│   │   ├── conversations.prisma
│   │   ├── models.prisma
│   │   ├── providers.prisma
│   │   ├── refreshToken.prisma
│   │   ├── session.prisma
│   │   └── user.prisma
│   ├── schema.prisma          # Main Prisma schema generator/datasource
│   ├── seed.ts                # Database seed script (Admin user & Gemini models)
│   └── conversationSeed.ts    # Seed initial test conversation data
├── src/
│   ├── config/                # Environment and Prisma initialization
│   │   ├── env.ts
│   │   └── prisma.ts
│   ├── controllers/           # Request handlers (Auth, User, Conversation, API Tokens)
│   ├── middlewares/           # Authentication, Admin, Error, and Validation middlewares
│   ├── modules/               # Zod validation schemas
│   ├── routes/                # Express API routes
│   ├── services/              # Business logic & Database interaction
│   ├── utils/                 # Utility functions (encryption, password hashing, async handler, mailer)
│   ├── app.ts                 # Express application configuration
│   └── server.ts              # Server startup script
├── tests/                     # Jest integration test suites
│   ├── auth/
│   └── setup/
├── .env.example               # Environment template file
├── jest.config.ts             # Jest configuration
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:

- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher (or `pnpm`/`yarn`)
- **PostgreSQL**: `v14` or higher running locally or accessible via URL

### 1. Clone & Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env` and fill in the required environment variables:

```bash
cp .env.example .env
```

#### Required Environment Variables Overview:

```ini
# Application Configuration
NODE_ENV=development
APP_NAME="MKK Agent"
PORT=8000
FRONTEND_URL="http://localhost:3000"

# PostgreSQL Database Connection String
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_agent"

# Security & Secrets
JWT_ACCESS_SECRET="your-32-byte-random-jwt-access-secret"
JWT_REFRESH_SECRET="your-32-byte-random-jwt-refresh-secret"
JWT_ACCESS_EXPIRES_IN="360m"
JWT_REFRESH_EXPIRES_IN="7d"
BCRYPT_SALT_ROUNDS=12
ENCRYPTION_KEY="your-32-byte-key-for-encrypting-api-tokens"

# Expiration Timers (Minutes)
VERIFY_MAIL_EXPIRES_IN=120
RESET_PASSWORD_EXPIRES_IN=5

# Google Gemini AI Integration
GEMINI_API_KEY="your-google-gemini-api-key"
GEMINI_DEFAULT_MODEL="gemini-3.8-flash"

# Mailer Configuration (SMTP)
MAIL_HOST="smtp.gmail.com"
MAIL_PORT=587
MAIL_USERNAME="your-email@gmail.com"
MAIL_PASSWORD="your-app-password"
MAIL_FROM_ADDRESS="your-email@gmail.com"
```

### 3. Database Migration & Seeding

Run Prisma migrations to create the database schema:

```bash
# Generate Prisma Client
npm run prisma:generate

# Execute Dev Migrations
npm run prisma:migrate
```

Seed initial data (creates default admin `admin@gmail.com` with password `Admin@123` and fetches active Gemini models):

```bash
npx tsx prisma/seed.ts
```

*(Optional)* Seed sample conversation data:

```bash
npx tsx prisma/conversationSeed.ts
```

### 4. Running the Application

```bash
# Start development server with auto-reload (tsx watch)
npm run dev

# Build TypeScript to JavaScript
npm run build

# Start production server
npm start
```

The API server will run on `http://localhost:8000` (or specified `PORT`).

---

## 📡 API Reference

Base URL: `http://localhost:8000/api`

### 🟢 System & Health

| Method  | Endpoint      | Auth | Description                  |
| :------ | :------------ | :--- | :--------------------------- |
| `GET` | `/health`   | No   | Server health check endpoint |
| `GET` | `/api/test` | No   | Basic API connectivity check |

### 🔑 Authentication Routes (`/api/auth`)

| Method   | Endpoint                         | Auth | Description                                      |
| :------- | :------------------------------- | :--- | :----------------------------------------------- |
| `POST` | `/api/auth/register`           | No   | Register a new user                              |
| `POST` | `/api/auth/login`              | No   | Authenticate user & issue JWT tokens             |
| `POST` | `/api/auth/logout`             | No   | Clear user refresh token & cookies               |
| `POST` | `/api/auth/token`              | No   | Refresh expired access token using refresh token |
| `GET`  | `/api/auth/user`               | Yes  | Get currently authenticated user details         |
| `POST` | `/api/auth/verify-mail/:token` | No   | Verify user email address                        |
| `POST` | `/api/auth/forgot-password`    | No   | Send password reset token to user email          |
| `POST` | `/api/auth/reset-password`     | No   | Reset user password using token                  |

### 👤 User Routes (`/api/user`) *(Requires Auth)*

| Method   | Endpoint                      | Access    | Description                           |
| :------- | :---------------------------- | :-------- | :------------------------------------ |
| `POST` | `/api/user/`                | Admin     | List all registered users (paginated) |
| `GET`  | `/api/user/:id`             | Admin     | Get user by ID                        |
| `PUT`  | `/api/user/`                | Auth User | Update current user profile           |
| `POST` | `/api/user/change-password` | Auth User | Change user password                  |
| `PUT`  | `/api/user/:id`             | Admin     | Update user details by ID             |

### 🤖 AI & Conversation Routes (`/api`) *(Requires Auth)*

| Method     | Endpoint                           | Description                                        |
| :--------- | :--------------------------------- | :------------------------------------------------- |
| `GET`    | `/api/model`                     | Retrieve active AI models available for generation |
| `GET`    | `/api/token`                     | Retrieve encrypted API key config for current user |
| `PUT`    | `/api/token`                     | Update user custom API key for a provider          |
| `POST`   | `/api/generate-stream-content`   | Stream AI response for a prompt (SSE compatible)   |
| `POST`   | `/api/retry-stream-content`      | Regenerate/retry a specific stream response        |
| `GET`    | `/api/conversations`             | Get paginated list of user conversations           |
| `GET`    | `/api/conversation/:id`          | Get single conversation metadata                   |
| `PUT`    | `/api/conversation/:id`          | Update conversation title or settings              |
| `DELETE` | `/api/conversation/:id`          | Delete conversation and associated messages        |
| `GET`    | `/api/conversation-messages/:id` | Get paginated messages for a conversation          |

---

## 🧪 Testing & Code Quality

### Running Tests

```bash
# Run Jest test suite
npm test

# Run tests in watch mode
npm run test:watch

# Generate test coverage report
npm run test:coverage

# Prepare test database migrations
npm run test:db:migrate
```

### Code Formatting & Linting

```bash
# Run ESLint check
npm run lint

# Format codebase using Prettier
npm run format

# Check formatting without writing
npm run format:check
```

---

## 🗄️ Database Tools

Inspect your database using **Prisma Studio**:

```bash
npm run prisma:studio
```

Access the UI locally at `http://localhost:5555`.
