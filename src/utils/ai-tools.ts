// src/ai/tools.ts

import { env } from "../config/env";
import type { ToolDefinition } from "../types/ai.types";
import logger from "./logger";

interface SearchResultItem {
  title: string;
  url: string;
  content: string;
  score?: number;
}

async function searchWithJina(query: string, maxResults: number): Promise<SearchResultItem[]> {
  const url = `https://s.jina.ai/${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "X-No-Cache": "true",
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`Jina search HTTP ${response.status}`);
  }

  const data = (await response.json()) as any;
  const list = Array.isArray(data?.data) ? data.data : [];

  return list.slice(0, maxResults).map((item: any) => ({
    title: item.title || "",
    url: item.url || "",
    content: item.description || (item.content ? item.content.slice(0, 800) : ""),
    score: 1,
  }));
}

async function searchWithDuckDuckGo(
  query: string,
  maxResults: number,
): Promise<SearchResultItem[]> {
  const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
    method: "GET",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`DuckDuckGo HTTP ${response.status}`);
  }

  const html = await response.text();
  const results: SearchResultItem[] = [];
  const regex =
    /<a class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null && results.length < maxResults) {
    let rawUrl = match[1] || "";
    const uddgMatch = rawUrl.match(/uddg=([^&]+)/);
    if (uddgMatch && uddgMatch[1]) {
      try {
        rawUrl = decodeURIComponent(uddgMatch[1]);
      } catch {
        // preserve original
      }
    }
    const cleanTitle = (match[2] || "").replace(/<[^>]+>/g, "").trim();
    const cleanSnippet = (match[3] || "").replace(/<[^>]+>/g, "").trim();

    if (rawUrl && cleanTitle) {
      results.push({
        title: cleanTitle,
        url: rawUrl,
        content: cleanSnippet,
        score: 1,
      });
    }
  }

  return results;
}

async function freeWebSearch(query: string, maxResults: number): Promise<SearchResultItem[]> {
  try {
    const results = await searchWithJina(query, maxResults);
    if (results.length > 0) return results;
  } catch (err) {
    logger.warn("Jina free web search failed, falling back to DuckDuckGo:", err);
  }

  try {
    const results = await searchWithDuckDuckGo(query, maxResults);
    if (results.length > 0) return results;
  } catch (err) {
    logger.warn("DuckDuckGo free web search failed:", err);
  }

  return [];
}

const aiTools: { webSearchTool: ToolDefinition } = {
  webSearchTool: {
    name: "web_search",

    description:
      "Search the web for current and up-to-date information. Use this when the user asks about recent, current, latest, live, or factual information that may have changed.",

    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query",
        },
        max_results: {
          type: "number",
          description: "Maximum number of search results. Default is 5.",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },

    async execute(args) {
      const query = typeof args.query === "string" ? args.query.trim() : "";
      if (!query) {
        throw new Error("query is required");
      }

      const maxResults = Number(args.max_results ?? 5);

      // If Tavily API Key is configured, use Tavily
      if (env.TAVILY_API_KEY && env.TAVILY_API_KEY.trim()) {
        try {
          const response = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              api_key: env.TAVILY_API_KEY,
              query,
              search_depth: "advanced",
              max_results: maxResults,
              include_answer: true,
              include_raw_content: false,
            }),
            signal: AbortSignal.timeout(10000),
          });

          if (response.ok) {
            const data = await response.json();
            return {
              answer: data.answer ?? null,
              results: (data.results ?? []).map((item: any) => ({
                title: item.title,
                url: item.url,
                content: item.content,
                score: item.score,
              })),
            };
          }
          logger.warn(`Tavily search returned ${response.status}, falling back to free search.`);
        } catch (err) {
          logger.warn("Tavily search request failed, falling back to free search:", err);
        }
      }

      // Free web search fallback without TAVILY_API_KEY (supports both OpenAI & Gemini)
      const results = await freeWebSearch(query, maxResults);

      return {
        answer: null,
        results,
      };
    },
  },
};

export default aiTools;
