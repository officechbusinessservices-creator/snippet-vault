#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
// Snippets stored in ~/.snippet-vault/snippets.json
const VAULT_DIR = path.join(os.homedir(), ".snippet-vault");
const VAULT_FILE = path.join(VAULT_DIR, "snippets.json");
function loadSnippets() {
    try {
        if (!fs.existsSync(VAULT_DIR))
            fs.mkdirSync(VAULT_DIR, { recursive: true });
        if (!fs.existsSync(VAULT_FILE))
            return [];
        return JSON.parse(fs.readFileSync(VAULT_FILE, "utf-8"));
    }
    catch {
        return [];
    }
}
function saveSnippets(snippets) {
    if (!fs.existsSync(VAULT_DIR))
        fs.mkdirSync(VAULT_DIR, { recursive: true });
    fs.writeFileSync(VAULT_FILE, JSON.stringify(snippets, null, 2));
}
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
function searchSnippets(snippets, query) {
    const q = query.toLowerCase();
    return snippets.filter((s) => {
        return (s.title.toLowerCase().includes(q) ||
            s.language.toLowerCase().includes(q) ||
            s.tags.some((t) => t.toLowerCase().includes(q)) ||
            s.code.toLowerCase().includes(q));
    });
}
const server = new index_js_1.Server({ name: "snippet-vault", version: "1.0.0" }, { capabilities: { tools: {} } });
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => ({
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
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const a = args;
    if (name === "save_snippet") {
        const snippets = loadSnippets();
        const now = new Date().toISOString();
        const snippet = {
            id: generateId(),
            title: String(a.title || "").trim(),
            code: String(a.code || ""),
            language: String(a.language || "text").toLowerCase().trim(),
            tags: Array.isArray(a.tags) ? a.tags.map(String) : [],
            createdAt: now,
            updatedAt: now,
        };
        if (!snippet.title)
            return { content: [{ type: "text", text: JSON.stringify({ error: "Title is required" }) }] };
        if (!snippet.code)
            return { content: [{ type: "text", text: JSON.stringify({ error: "Code is required" }) }] };
        snippets.push(snippet);
        saveSnippets(snippets);
        return { content: [{ type: "text", text: JSON.stringify({ success: true, id: snippet.id, title: snippet.title }) }] };
    }
    if (name === "search_snippets") {
        const query = String(a.query || "").trim();
        if (!query)
            return { content: [{ type: "text", text: JSON.stringify([]) }] };
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
        if (!snippet)
            return { content: [{ type: "text", text: JSON.stringify({ error: `Snippet '${id}' not found` }) }] };
        return { content: [{ type: "text", text: JSON.stringify(snippet, null, 2) }] };
    }
    if (name === "list_snippets") {
        const snippets = loadSnippets();
        if (snippets.length === 0)
            return { content: [{ type: "text", text: JSON.stringify({ message: "No snippets saved yet. Use save_snippet to add your first one.", count: 0 }) }] };
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
        if (index === -1)
            return { content: [{ type: "text", text: JSON.stringify({ error: `Snippet '${id}' not found` }) }] };
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
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
}
main().catch(console.error);
