# Scout MCP server

Local stdio MCP server that exposes Scout as one Cursor tool: `scout_search(query: string)`.

It drains the shared `orchestrate()` generator (same module as the Next.js app). It does not reimplement fan-out. It is world search only — Cursor's host agent already has repo `semSearch`.

When the MCP client supplies a progress token, graph events are forwarded as
`notifications/progress`. A 30-second heartbeat covers long gaps between graph
events so clients with an idle timeout do not abandon an otherwise healthy
search. MCP cancellation is propagated into `orchestrate()` and its upstream
requests.

Tool registration is shared code (`mcp-server/server.ts`): both this stdio process and the hosted HTTP endpoint (`app/api/mcp/route.ts`) call the same `createScoutServer()`.

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

## Hosted (HTTP)

`app/api/mcp/route.ts` exposes the same `scout_search` tool over Streamable HTTP for machines that can't spawn the stdio process. It requires a bearer token — set `SCOUT_MCP_TOKEN` in the Vercel project env (same value used below), plus `GROK_API_KEY` and `SEMANTIC_SCHOLAR_API_KEY`.

```json
{
  "mcpServers": {
    "scout-hosted": {
      "url": "https://scoutsearch.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer ${env:SCOUT_MCP_TOKEN}"
      }
    }
  }
}
```

Anyone holding the token can spend the Grok/Semantic Scholar keys through this endpoint — treat it like a credential, not a config value.

## Built start

```bash
cd mcp-server && npm run build && npm start
```

`npm start` still needs `GROK_API_KEY` in the environment (or run via `./mcp-server/start.sh`).

## Security

- Local (`index.ts`, stdio): no HTTP surface, Keychain-backed keys, nothing to authenticate — process access is the trust boundary.
- Hosted (`app/api/mcp`): public HTTP, so it requires a bearer token (`SCOUT_MCP_TOKEN`); requests without a matching `Authorization` header get a 401 before `orchestrate()` runs.
- Either path: the tool calls Grok (`GROK_API_KEY`) and optionally Semantic Scholar. Anyone who can talk to it — locally via stdio, or remotely with the bearer token — can spend those keys.
- Do not log secrets. Do not put keys or the bearer token in the repo.
