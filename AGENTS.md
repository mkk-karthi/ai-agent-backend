# Backend Development Rules & Agent Guidelines

Welcome to the **MKK AI Agent - Backend** repository. This service provides the high-performance TypeScript API (Express.js v5, Prisma ORM, PostgreSQL) for the MKK AI Agent platform.

All AI agents working within this repository **MUST** follow these core guidelines without exception.

---

## ⛔ CRITICAL SECURITY RULE: Environment Isolation (.env)

> [!CAUTION]
> **NEVER read, inspect, search, or write `.env` files.**
> 
> - Under **no circumstances** should agent tools (`view_file`, `replace_file_content`, `multi_replace_file_content`, `write_to_file`, `grep_search`, `run_command` with `cat`/`head`/`tail`/`grep`, etc.) be used to access or modify `.env` files containing live secrets, keys, or credentials.
> - **Always** inspect and modify `.env.example` as the canonical template when documenting, adding, or updating environment variables.
> - When guiding users on setup, direct them to copy `.env.example` to `.env` and populate their secrets manually.

---

## 📁 Repository Structure

```text
backend/
├── prisma/                        # Modular Prisma ORM definitions
│   ├── migrations/                # Database migrations
│   ├── models/                    # 1 schema model per file (*.prisma)
│   ├── schema.prisma              # Datasource & client generator
│   └── seed.ts                    # Admin user & default models seed
├── src/
│   ├── config/                    # env.ts, prisma.ts, passport.ts
│   ├── controllers/               # Express request handlers (wrapped in asyncHandler)
│   ├── middlewares/               # auth, admin, captcha, error, validate middlewares
│   ├── modules/                   # Zod request validation schemas
│   ├── routes/                    # Express route definitions
│   ├── services/                  # Business logic (ai, auth, conversation, provider, recaptcha, user)
│   ├── types/                     # TypeScript type definitions
│   ├── utils/                     # ai-tools, cryptoUtils, jwt, logger, mail, password
│   ├── app.ts                     # Express app & pipeline
│   └── server.ts                  # Server entrypoint
├── .agents/
│   ├── rules/no-env.md            # Standalone .env protection rule
│   └── skills/ai-agent-backend/   # Backend architecture skill
├── .env.example                   # Canonical environment template
├── package.json                   # Dependencies and scripts
└── tsconfig.json                  # TypeScript compiler options
```

---

## 🛠️ Architecture Conventions & Rules

1. **AI Engine & Tools (`src/services/ai.service.ts`)**:
   - Unified `openai` SDK client for both OpenAI and Google Gemini (`https://generativelanguage.googleapis.com/v1beta/openai/`).
   - Tools must always use `type: "function"` with schema `{ name, description, parameters }`. Never pass raw string types like `"web_search"`.
   - Autonomous web search (`src/utils/ai-tools.ts`) implements a 3-tier resilient fallback: Tavily API $\rightarrow$ Jina AI (`https://s.jina.ai/{query}`) $\rightarrow$ DuckDuckGo scraper. Never throw on missing keys.
2. **Conversation Sharing**:
   - `ConversationShareType` supports `RESTRICTED` (default, private), `PUBLIC`, and `SPECIFIC_USER`.
   - Public read endpoints (`/shared/conversation/*`) are whitelisted in `auth.middleware.ts` without returning 401.
3. **Authentication & Security**:
   - Google OAuth2 uses Passport.js stateless JWT token flow. Callback sets HttpOnly refresh cookie and redirects to `/auth/google/callback?token=${accessToken}` without leaking personal data in query parameters.
   - Accounts created via Google OAuth can dynamically set a password via "Create Password" flow (omitting `oldPassword`).
   - Google reCAPTCHA v3 (`verifyCaptcha` middleware) protects `/auth/login`, `/auth/register`, `/auth/forgot-password`, and `/auth/reset-password`.
   - User-supplied API keys must be encrypted with AES-256 (`cryptoUtils.ts`) before saving.
4. **Controllers & Errors**:
   - Every controller handler must be wrapped in `asyncHandler`.
   - Use `ApiError` for throwing operational errors and `ApiResponse` for standard responses.
   - Validate incoming payloads with Zod schemas in `src/modules/`.

---

## 🧪 Verification Standard

Before concluding any work, run the production build to ensure 0 TypeScript compilation errors:

```bash
# Node environment path helper
export PATH="/home/mkk/.nvm/versions/node/$(ls /home/mkk/.nvm/versions/node 2>/dev/null | tail -n 1)/bin:$PATH"

# Build verification
npm run build
```
