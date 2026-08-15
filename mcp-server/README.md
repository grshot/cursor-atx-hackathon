# Scout MCP server

Local stdio MCP server that exposes Scout as one Cursor tool: `scout_search(query: string)`.

It drains the shared `orchestrate()` generator (same module as the Next.js app). It does not reimplement fan-out. It is world search only — Cursor's host agent already has repo `semSearch`.

This process is **not hosted**. Cursor on the demo machine spawns it. Do not add an HTTP MCP URL.

## Run (dev)

From the repo root. `start.sh` loads `GROK_API_KEY` from Keychain if it is not already in the environment (`SEMANTIC_SCHOLAR_API_KEY` is optional):

```bash
./mcp-server/start.sh
```

Equivalent without the wrapper:

```bash
GROK_API_KEY=$(security find-generic-password -a "username" -s "xai_api" -w) \
  npx tsx --tsconfig tsconfig.json mcp-server/index.ts
```

Logs go to stderr. stdout is JSON-RPC only.

## Cursor config

Add to Cursor MCP settings. Set `cwd` to this repo root. Do not put the API key in this JSON — the start script reads Keychain.

```json
{
  "mcpServers": {
    "scout": {
      "command": "./mcp-server/start.sh",
      "cwd": "/absolute/path/to/cursor-atx-hackathon"
    }
  }
}
```

After Phase 2/3 replace the stub `orchestrate()`, this tool returns live graph data with no MCP code change.

## Built start

```bash
cd mcp-server && npm run build && npm start
```

`npm start` still needs `GROK_API_KEY` in the environment (or run via `./mcp-server/start.sh`).

## Security

- Stdio only; no unauthenticated HTTP surface.
- The tool may call Grok (`GROK_API_KEY`) and optionally Semantic Scholar. Anyone who can talk to this Cursor MCP can spend those keys.
- Do not log secrets. Do not put keys in the repo.
