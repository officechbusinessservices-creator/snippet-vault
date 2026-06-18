#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Snippets stored in ~/.snippet-vault/snippets.json
const VAULT_DIR = path.join(os.homedir(), ".snippet-vault");
const VAULT_FILE = path.join(VAULT_DIR, "snippets.json");

type Snippet = {
  id: string;
  title: string;
  code: string;
  language: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

function loadSnippets(): Snippet[] {
  try {
    if (!fs.existsSync(VAULT_DIR)) fs.mkdirSync(VAULT_DIR, { recursive: true });
    if (!fs.existsSync(VAULT_FILE)) return [];
    return JSON.parse(fs.readFileSync(VAULT_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveSnippets(snippets: Snippet[]): void {
  if (!fs.existsSync(VAULT_DIR)) fs.mkdirSync(VAULT_DIR, { recursive: true });
  fs.writeFileSync(VAULT_FILE, JSON.stringify(snippets, null, 2));
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function searchSnippets(snippets: Snippet[], query: string): Snippet[] {
  const q = query.toLowerCase();
  return snippets.filter((s) => {
    return (
      s.title.toLowerCase().includes(q) ||
      s.language.toLowerCase().includes(q) ||
      s.tags.some((t) => t.toLowerCase().includes(q)) ||
      s.code.toLowerCase().includes(q)
    );
  });
}

const server = new Server(
  { name: "snippet-vault", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "save_snippet",
      description: "Save a code snippet to your personal vault",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string", description: "Short title for the snippet e.g. 'Debounce function'" },
          code: { type: "string", description: "The code to save" },
          language: { type: "string", description: "Programming language e.g. 'typescript', 'python', 'bash'" },
          tags: {
            type: "array",
            items: { type: "string" },
            description: "Tags for searching later e.g. ['utility', 'async', 'react']",
          },
        },
        required: ["title", "code", "language"],
      },
    },
    {
      name: "search_snippets",
      description: "Search your saved snippets by title, language, tag, or content",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query e.g. 'debounce', 'typescript', 'auth'" },
        },
        required: ["query"],
      },
    },
    {
      name: "get_snippet",
      description: "Get a specific snippet by its ID",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Snippet ID" },
        },
        required: ["id"],
      },
    },
    {
      name: "list_snippets",
      description: "List all saved snippets (titles and IDs only)",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "delete_snippet",
      description: "Delete a snippet from your vault by ID",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Snippet ID to delete" },
        },
        required: ["id"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const a = args as any;

  if (name === "save_snippet") {
    const snippets = loadSnippets();
    const now = new Date().toISOString();
    const snippet: Snippet = {
      id: generateId(),
      title: String(a.title || "").trim(),
      code: String(a.code || ""),
      language: String(a.language || "text").toLowerCase().trim(),
      tags: Array.isArray(a.tags) ? a.tags.map(String) : [],
      createdAt: now,
      updatedAt: now,
    };
    if (!snippet.title) return { content: [{ type: "text", text: JSON.stringify({ error: "Title is required" }) }] };
    if (!snippet.code) return { content: [{ type: "text", text: JSON.stringify({ error: "Code is required" }) }] };
    snippets.push(snippet);
    saveSnippets(snippets);
    return { content: [{ type: "text", text: JSON.stringify({ success: true, id: snippet.id, title: snippet.title }) }] };
  }

  if (name === "search_snippets") {
    const query = String(a.query || "").trim();
    if (!query) return { content: [{ type: "text", text: JSON.stringify([]) }] };
    const snippets = loadSnippets();
    const results = searchSnippets(snippets, query).map((s) => ({
      id: s.id,
      title: s.title,
      language: s.language,
      tags: s.tags,
      preview: s.code.slice(0, 120) + (s.code.length > 120 ? "..." : ""),
    }));
    return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
  }

  if (name === "get_snippet") {
    const id = String(a.id || "").trim();
    const snippets = loadSnippets();
    const snippet = snippets.find((s) => s.id === id);
    if (!snippet) return { content: [{ type: "text", text: JSON.stringify({ error: `Snippet '${id}' not found` }) }] };
    return { content: [{ type: "text", text: JSON.stringify(snippet, null, 2) }] };
  }

  if (name === "list_snippets") {
    const snippets = loadSnippets();
    if (snippets.length === 0) return { content: [{ type: "text", text: JSON.stringify({ message: "No snippets saved yet. Use save_snippet to add your first one.", count: 0 }) }] };
    const result = snippets.map((s) => ({
      id: s.id,
      title: s.title,
      language: s.language,
      tags: s.tags,
      createdAt: s.createdAt,
    }));
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }

  if (name === "delete_snippet") {
    const id = String(a.id || "").trim();
    const snippets = loadSnippets();
    const index = snippets.findIndex((s) => s.id === id);
    if (index === -1) return { content: [{ type: "text", text: JSON.stringify({ error: `Snippet '${id}' not found` }) }] };
    const deleted = snippets.splice(index, 1)[0];
    saveSnippets(snippets);
    return { content: [{ type: "text", text: JSON.stringify({ success: true, deleted: deleted.title }) }] };
  }

  return {
    content: [{ type: "text", text: JSON.stringify({ error: `Unknown tool: ${name}` }) }],
    isError: true,
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
