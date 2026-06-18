# snippet-vault

An MCP server that gives Claude a personal code snippet library. Save snippets during any conversation and retrieve them later — across sessions, projects, and machines.

## What it does

**`save_snippet`** — save any code block with a title, language, and tags

**`search_snippets`** — search by title, language, tag, or content

**`get_snippet`** — retrieve a full snippet by ID

**`list_snippets`** — see all saved snippets

**`delete_snippet`** — remove a snippet by ID

Snippets are stored locally at `~/.snippet-vault/snippets.json` — your data stays on your machine.

## Example prompts

- *"Save this debounce function to my vault with tags: utility, typescript"*
- *"Find my auth middleware snippet"*
- *"Show me all my Python snippets"*
- *"List everything in my vault"*
- *"Delete snippet abc123"*

## Add to Claude Desktop

```json
{
  "mcpServers": {
    "snippet-vault": {
      "command": "npx",
      "args": ["-y", "@engineeringmatrixexplorer/snippet-vault"]
    }
  }
}
```

## Add to Claude Code

```bash
claude mcp add snippet-vault -- npx -y @engineeringmatrixexplorer/snippet-vault
```

## Where snippets are stored

Snippets live at `~/.snippet-vault/snippets.json` on your machine. No cloud, no account, no tracking.

## Requirements

- Node.js 18+

## Part of the MCP Developer Tools Bundle

This server is also available as part of a bundle with [engineering-matrix-explorer](https://github.com/officechbusinessservices-creator/engineering-matrix-explorer) and [stack-advisor](https://github.com/officechbusinessservices-creator/stack-advisor).

## License

MIT
