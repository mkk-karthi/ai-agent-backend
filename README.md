# MKK AI Agent - Backend

A powerful and reliable backend API server for the MKK AI Agent platform. Built with **Node.js**, **Express.js v5**, **TypeScript**, **Prisma ORM**, and **PostgreSQL**.

It handles user accounts, chat conversations, live streaming responses, and communicates with AI providers (OpenAI and Google Gemini) with automatic web search capabilities.

---

## 🔗 Project Links

- **Backend (This Repository)**: [https://github.com/mkk-karthi/ai-agent-backend](https://github.com/mkk-karthi/ai-agent-backend)
- **Frontend Repository**: [https://github.com/mkk-karthi/ai-agent-frontend](https://github.com/mkk-karthi/ai-agent-frontend)

---

## 📸 Screenshots

### 💬 Real-Time Chat & Autonomous Web Search
![Chat Interface](docs/images/chat-interface.png)

### 📊 Admin Analytics Dashboard
![Admin Dashboard](docs/images/dashboard.png)

---

## ✨ Features at a Glance

- ⚡ **Live Streaming Responses (SSE)**: Streams AI answers token-by-token directly to the user as they are generated.
- 🌐 **Automatic Web Search**: When a question needs real-time internet info, the AI searches the web on the fly (using Tavily, Jina AI, or DuckDuckGo fallback—no paid key required to test).
- 🤖 **Multiple AI Providers**: Seamlessly switches between OpenAI (GPT-4o) and Google Gemini (Gemini 2.5/2.0 Flash) models using a single unified interface.
- 🌳 **Smart Chat Memory & Branching**: Saves conversation history, letting users edit earlier messages or retry answers without losing previous turns.
- 🔗 **Chat Sharing Control**:
  - **Restricted (Default)**: Private to the conversation owner.
  - **Public**: Anyone with the link can view the conversation in read-only mode.
  - **Specific Users**: Only designated email addresses can access the chat.
- 🔑 **Google Sign-In & Email Authentication**:
  - Full Google OAuth2 sign-in with secure cookies and clean URLs.
  - Traditional email/password signup and verification.
  - Users who sign up with Google can optionally set a password anytime.
- 🛡️ **Bot Protection (reCAPTCHA v3)**: Protects login, registration, and password reset endpoints from automated bots.
- 🪙 **Token Usage Tracking**: Automatically counts and records prompt tokens and response tokens per message.
- 🔒 **Encrypted API Keys**: Users can add their own OpenAI or Gemini API keys, which are safely encrypted with AES-256 in the database.

---

## 🛠️ Tech Stack

| Tool | Purpose | Why We Use It |
| :--- | :--- | :--- |
| **Node.js & Express.js 5** | Web Server | Fast, lightweight, and modern API framework |
| **TypeScript** | Language | Type-safe code that prevents runtime errors |
| **PostgreSQL & Prisma ORM** | Database | Clean database schema with migrations and relations |
| **OpenAI SDK** | AI Engine | Unified client for both OpenAI and Google Gemini APIs |
| **Passport.js** | Authentication | Handles Google OAuth2 authentication smoothly |
| **Zod** | Validation | Checks and validates all incoming API data |
| **bcrypt & crypto** | Security | Secure password hashing and AES-256 key encryption |
| **reCAPTCHA v3** | Anti-Bot | Transparent score-based verification |

---

## 📁 Project Folder Structure

```text
backend/
├── prisma/
│   ├── models/                  # Separate schema file for each database table
│   │   ├── apiTokens.prisma     # Encrypted user API keys
│   │   ├── conversationMessages.prisma # Chat messages with tree history
│   │   ├── conversationShare.prisma    # Sharing settings (Restricted, Public, Specific Users)
│   │   ├── conversations.prisma # Chat sessions
│   │   ├── models.prisma        # Available AI models (GPT-4o, Gemini, etc.)
│   │   ├── providers.prisma     # AI Providers (OpenAI, Gemini)
│   │   ├── refreshToken.prisma  # JWT refresh tokens
│   │   ├── session.prisma       # Active user sessions
│   │   ├── tokenUsage.prisma    # Token usage per message
│   │   └── user.prisma          # User accounts and roles (USER, ADMIN)
│   ├── schema.prisma            # Main Prisma configuration
│   ├── seed.ts                  # Seeds initial admin user and default AI models
│   └── conversationSeed.ts      # Seeds sample conversation data
├── src/
│   ├── config/                  # Environment, Prisma client, and Passport OAuth setup
│   ├── controllers/             # Request handlers for Auth, Conversations, Users, Providers
│   ├── middlewares/             # Security, JWT auth, reCAPTCHA, and error handlers
│   ├── modules/                 # Zod validation schemas
│   ├── routes/                  # Express route definitions
│   ├── services/                # Business logic (AI streaming, chat history, auth, user management)
│   ├── utils/                   # Helpers (web search tool, JWT, mailer, encryption, password)
│   ├── app.ts                   # Express application setup
│   └── server.ts                # Server startup script
├── tests/                       # Automated tests (Jest)
├── .env.example                 # Template for environment settings
├── package.json                 # Dependencies and scripts
└── tsconfig.json                # TypeScript compiler configuration
```

---

## 🚀 Getting Started (Beginner Guide)

Follow these steps to get the backend running locally.

### Prerequisites

- **Node.js** (v18 or higher)
- **PostgreSQL** (v14 or higher running on your system)
- **npm** (comes with Node.js)

### Step 1: Install Dependencies

```bash
cd backend
npm install
```

### Step 2: Set Up Environment Variables

Copy the example file to create your `.env`:

```bash
cp .env.example .env
```

Open `.env` in your text editor and set your configuration:
- `DATABASE_URL`: Your PostgreSQL connection string (e.g., `postgresql://postgres:password@localhost:5432/ai_agent_db`).
- `ACCESS_TOKEN_SECRET` & `REFRESH_TOKEN_SECRET`: Random secret strings for JWT tokens.
- `ENCRYPTION_KEY`: A 32-character string used to encrypt stored API keys.
- `GEMINI_API_KEY` / `OPENAI_API_KEY`: (Optional) Default API keys for the server.

> [!CAUTION]
> **Never commit your `.env` file to version control.** It contains private database passwords and secret keys. Always use `.env.example` as a template.

### Step 3: Run Database Migrations & Seed Data

Run this command to create your database tables and seed the initial admin account and default AI models:

```bash
# Apply database migrations
npm run prisma:migrate

# Seed admin user and default models
npx tsx prisma/seed.ts
```

> **Default Admin Account:**
> - Email: `admin@gmail.com`
> - Password: `Admin@123`

### Step 4: Start the Development Server

```bash
npm run dev
```

The server will start at **`http://localhost:5000`**.

### Step 5: Build for Production

```bash
npm run build
npm start
```

---

## 💡 How Key Features Work (Simple Explanations)

### 1. AI Streaming Chat Flow
1. The frontend sends the user's prompt to `POST /conversation/generate-stream-content`.
2. The server loads recent messages from the database so the AI remembers the conversation context.
3. The server calls the AI model (OpenAI or Gemini) using streaming.
4. As words arrive from the AI, the server sends them immediately to the frontend using Server-Sent Events (SSE).
5. When the answer is done, the server saves the message and logs token usage in PostgreSQL.

### 2. Automatic Web Search
1. When the AI decides it needs fresh data (for example, "What is the latest news today?"), it calls the `web_search` tool.
2. The server tries searching via:
   - **Tavily API** (if an API key is provided).
   - **Jina AI** (free, no API key needed).
   - **DuckDuckGo** (fallback scraper).
3. The search results are fed back into the AI, which writes a grounded answer with citations.

### 3. Conversation Sharing
- Each conversation has a sharing setting in the database:
  - `RESTRICTED` (default): Only the owner can view it.
  - `PUBLIC`: Anyone can view the chat at `/shared/conversation/:id` without logging in.
  - `SPECIFIC_USER`: Only users whose emails are in the allowed list can view it.

### 4. Google OAuth & Hybrid Password
- Users can click **Sign in with Google** to log in without a password.
- If a Google user later wants to log in with an email and password, they can set one in their profile settings without having to provide an "old password".

---

## 📡 API Endpoints Summary

| Group | Method & Route | What It Does |
| :--- | :--- | :--- |
| **Auth** | `POST /auth/register` | Create a new user account (protected with reCAPTCHA) |
| | `POST /auth/login` | Log in with email and password (protected with reCAPTCHA) |
| | `POST /auth/logout` | Log out and clear session cookies |
| | `GET /auth/google` | Start Google OAuth2 sign-in |
| | `GET /auth/google/callback` | Google OAuth2 redirect callback |
| | `POST /auth/forgot-password` | Send password reset email |
| | `POST /auth/reset-password` | Reset password using email OTP |
| **Conversations** | `POST /conversation/generate-stream-content` | Stream AI chat response |
| | `POST /conversation/retry-stream-content` | Retry or regenerate an AI response |
| | `GET /conversation/list` | List user's conversations with pagination |
| | `DELETE /conversation/:id` | Delete a conversation |
| | `POST /conversation/share` | Update sharing settings (Restricted, Public, Specific Users) |
| **Public Shared** | `GET /shared/conversation/:id` | Read a shared conversation (no login required for public chats) |
| **User Profile** | `GET /user/:id` | Get user profile |
| | `PUT /user` | Update profile information |
| | `POST /user/change-password` | Change password (or create password for Google accounts) |
| **Providers** | `GET /provider/list` | List active AI models and providers |
| **API Tokens** | `POST /token` | Add or update an encrypted personal API key |

---

## 📄 License

This project is licensed under the MIT License.
