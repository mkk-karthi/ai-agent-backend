export interface GenerateOptions {
  tools?: {
    webSearch?: boolean;
  };
  systemPrompt?: string;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  temperature?: number;
  maxTokens?: number;
  onChunk?: (v: string) => void;
  conversationId?: string;
  lastMessageId?: string;
}

export interface GenerateResult {
  model: string;
  content: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  toolCalls?: unknown[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}
