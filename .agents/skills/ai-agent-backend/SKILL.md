---
name: ai-agent-backend
description: >-
  Workflow guide and runbook for developing, testing, migrating, and maintaining the MKK AI Agent
  backend service (Express.js, Prisma, PostgreSQL, Google Gemini AI SDK). Use when working on
  backend routes, database schemas, AI stream content generation, authentication, or running tests.
---

# MKK AI Agent Backend Development Skill

This skill provides step-by-step guidance and runbooks for working with the **MKK AI Agent Backend** service built on Express.js v5, Prisma ORM, PostgreSQL, and Google Gemini AI SDK (`@google/genai`).

---

## 🛠️ Environment & Development Workflow

### 1. Environment Verification
Ensure `.env` exists and contains valid values before starting work. If missing, copy from `.env.example`:
```bash
cp .env.example .env
```
Key variables to verify:
- `DATABASE_URL`: PostgreSQL connection string.
- `JWT_ACCESS_SECRET` & `JWT_REFRESH_SECRET`: Secrets for authentication tokens.
- `ENCRYPTION_KEY`: 32-character key for encrypting stored user API keys.
- `GEMINI_API_KEY`: API key for Google Gemini model requests.

### 2. Development Server
Start the auto-reloading development server:
```bash
npm run dev
```
The server listens on `http://localhost:8000` (or `PORT` defined in `.env`). Check health status via:
`GET http://localhost:8000/health`

---

## 🗄️ Database & Prisma Management

This project uses modular Prisma model files inside `prisma/models/`.

### Modifying Database Schemas
1. Edit or add model files in `prisma/models/` (e.g., `prisma/models/user.prisma`).
2. Generate the updated Prisma client:
   ```bash
   npm run prisma:generate
   ```
3. Run dev migration to apply changes to PostgreSQL:
   ```bash
   npm run prisma:migrate
   ```

### Database Seeding
Seed initial admin user (`admin@gmail.com` / `Admin@123`) and automatically discover active Gemini models:
```bash
npx tsx prisma/seed.ts
```

*(Optional)* Seed sample conversation history:
```bash
npx tsx prisma/conversationSeed.ts
```

### Inspecting Database State
Launch Prisma Studio UI:
```bash
npm run prisma:studio
```

---

## 🤖 Google Gemini AI Streaming Integration

### Stream Generation Architecture
- Main controller: `src/controllers/conversation.controller.ts`
- Service: `src/services/conversation.service.ts`
- AI SDK: `@google/genai` (`GoogleGenAI` class)

### Key Rules for AI Model Requests:
1. **API Key Priority**: Check if the authenticated user has configured a custom encrypted API token (`apiToken.service.ts`). If present, decrypt and use it. Otherwise, fall back to default `GEMINI_API_KEY` from environment variables.
2. **Streaming Response**: Streaming responses use Server-Sent Events (SSE) or chunked text transfer (`/generate-stream-content`). Ensure proper error handling and client disconnect handling.
3. **Model Fallback**: Validate model availability against the `Model` database table before invoking generation.

---

## 🔐 Auth & Security Patterns

- **Authentication**: Routes in `src/routes/user.route.ts` and `src/routes/conversation.route.ts` use the `authenticate` middleware (`src/middlewares/auth.middleware.ts`).
- **Authorization**: Admin routes use `adminMiddleware` (`src/middlewares/admin.middleware.ts`).
- **Input Validation**: Request bodies/queries must be validated using Zod schemas (`src/modules/*`) via `validate` middleware (`src/middlewares/validate.middleware.ts`).
- **Password & Token Security**: Use helper utilities in `src/utils/password.ts` and `src/utils/encryption.ts`.

---

## 🧪 Testing & Code Quality

### Running Tests
Execute the Jest test suite for API endpoints and auth flows:
```bash
# Run tests
npm test

# Generate coverage report
npm run test:coverage
```

### Code Formatting & Linting
Always run lint and format checks after modifying code:
```bash
npm run lint
npm run format
```
