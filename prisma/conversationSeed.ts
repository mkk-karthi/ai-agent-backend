import { AiRole, Status } from "@prisma/client";
import { prisma } from "../src/config/prisma";

const SAMPLE_MARKDOWN_PROMPTS = [
  "Can you write a **TypeScript** function to parse *JSON* safely?",
  "How do I set up a `docker-compose.yml` file for a Node.js and PostgreSQL app?",
  "Explain the difference between `interface` and `type` in **TypeScript**.",
  "Write a `bash` script to check disk usage and send an alert.",
  "How can I optimize this SQL query for better performance?",
  "Can you create a simple **React** custom hook for fetching data?",
  "How do I implement `JWT` authentication in an Express API?",
  "What is the best way to handle errors in **Prisma ORM**?",
  "Write a Python function to read a CSV file and return summary statistics.",
  "How do I configure `Nginx` as a reverse proxy for my web server?",
];

const SAMPLE_MARKDOWN_RESPONSES = [
  `Here is a safe JSON parsing utility function in **TypeScript**:

\`\`\`typescript
function safeJsonParse<T>(jsonString: string): { success: boolean; data?: T; error?: Error } {
  try {
    const data = JSON.parse(jsonString) as T;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
\`\`\`

### Usage Example:
\`\`\`typescript
const result = safeJsonParse<{ name: string }>('{"name": "Agent"}');
if (result.success) {
  console.log(result.data?.name);
}
\`\`\``,

  `Here is a production-ready \`docker-compose.yml\` configuration:

\`\`\`yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: "postgresql://postgres:postgres@db:5432/agent_db?schema=public"
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: agent_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
\`\`\``,

  `In **TypeScript**, both \`type\` and \`interface\` can be used to define shapes of objects, but they have key structural differences:

| Feature | Interface | Type Alias |
| :--- | :--- | :--- |
| **Declaration Merging** | Supported (\`interface User { ... }\`) | Not supported |
| **Unions & Primitives** | Cannot represent unions directly | Supported (\`type ID = string \\| number\`) |
| **Extends Syntax** | Uses \`extends\` keyword | Uses intersection (\`&\`) |

### Example:
\`\`\`typescript
interface BaseUser {
  id: string;
}

interface User extends BaseUser {
  name: string;
}
\`\`\``,

  `Here is a simple **Bash** script to monitor disk usage:

\`\`\`bash
#!/usr/bin/env bash

THRESHOLD=80
CURRENT_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')

if [ "$CURRENT_USAGE" -gt "$THRESHOLD" ]; then
  echo "WARNING: Disk usage is above threshold! Current usage: \${CURRENT_USAGE}%"
else
  echo "Disk space OK: \${CURRENT_USAGE}%"
fi
\`\`\``,

  `To optimize SQL queries in **PostgreSQL**, follow these best practices:

1. Add indexes on frequently queried columns:
\`\`\`sql
CREATE INDEX idx_conversation_messages_user_id ON conversation_messages(user_id);
\`\`\`
2. Avoid \`SELECT *\` and select specific fields.
3. Use \`EXPLAIN ANALYZE\` to profile query execution plans.`,
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  // Fetch existing prerequisites to satisfy foreign key constraints
  const existingUser = await prisma.user.findFirst({ where: { email: "user@gmail.com" } });
  const existingModel = await prisma.model.findFirst();

  if (!existingUser || !existingModel) {
    throw new Error(
      "Seeder requires at least one User, Provider, and Model record in the database.",
    );
  }

  const userId = existingUser.id;
  const providerId = 1;
  const modelId = existingModel.id;

  console.log("Starting seed process...");
  for (let c = 1; c <= 30; c++) {
    const conversation = await prisma.conversation.create({
      data: {
        name: `Discussion - Topic #${c}`,
        userId,
        totalTokens: 0,
        status: Status.ACTIVE,
      },
    });

    console.log(`[${new Date().toISOString()}] Created Conversation ID: ${conversationId}`);
    await sleep(10);

    let runningTotalTokens = 0;
    let lastMessageId = null;

    for (let m = 0; m < 20; m++) {
      // 1. Create USER Message sequentially
      const userPrompt = SAMPLE_MARKDOWN_PROMPTS[m % SAMPLE_MARKDOWN_PROMPTS.length];
      const promptTokens = Math.floor(Math.random() * 50) + 20;

      const userMessage = await prisma.conversationMessages.create({
        data: {
          message: userPrompt,
          role: AiRole.USER,
          conversationId: conversationId,
          userId,
          providerId,
          modelId,
          promptTokens,
          outputTokens: 0,
          status: Status.ACTIVE,
          parentId: lastMessageId,
        },
      });

      runningTotalTokens += promptTokens;
      console.log(`  [${new Date().toISOString()}] Created USER Message ID: ${userMessage.id}`);
      await sleep(10);

      // 2. Create ASSISTANT Message sequentially
      const assistantResponse = SAMPLE_MARKDOWN_RESPONSES[m % SAMPLE_MARKDOWN_RESPONSES.length];
      const outputTokens = Math.floor(Math.random() * 300) + 100;

      const assistantMessage = await prisma.conversationMessages.create({
        data: {
          message: assistantResponse,
          role: AiRole.ASSISTANT,
          conversationId: conversationId,
          userId,
          providerId,
          modelId,
          promptTokens: 0,
          outputTokens,
          status: Status.ACTIVE,
          parentId: userMessage.id,
        },
      });
      lastMessageId = assistantMessage.id;

      runningTotalTokens += outputTokens;
      console.log(
        `  [${new Date().toISOString()}] Created ASSISTANT Message ID: ${assistantMessage.id}`,
      );
    }

    // Update conversation total tokens after inserting all its messages
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { totalTokens: runningTotalTokens },
    });

    console.log(`Completed Conversation #${c} (Total Tokens: ${runningTotalTokens}).`);
    await sleep(10);
  }

  console.log("Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
