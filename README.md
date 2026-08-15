# Scout

Agentic graph search — a query fans out into 6 retrieval agents (web, X, academic, and 3 sub-query angles), rendered as a live-populating node graph instead of a results list. Two entry points share one orchestration core: this Next.js web app, and an MCP server (`mcp-server/`) callable from Cursor's agent chat.

See `specs/2032e2-agentic-graph-search.md` for the full spec and `plans/2032e2-agentic-graph-search.md` for the phased build plan.

## Setup

1. Install dependencies:
   ```
   npm install
   ```
2. Copy the env template and fill in real keys:
   ```
   cp .env.local.example .env.local
   ```
   - `GROK_API_KEY` — required. xAI API key (Grok 4.6, `web_search`, `x_search`). Recommended Keychain lookup:
     ```
     GROK_API_KEY=$(security find-generic-password -a "username" -s "xai_api" -w)
     ```
     Write it into `.env.local`, or export it in the shell before `next dev` / `vercel dev`.
   - `SEMANTIC_SCHOLAR_API_KEY` — optional. Raises Semantic Scholar `/paper/search` rate limits. Anonymous access may 429 on hackathon wifi; a bad key (403) is retried once without the header. If search still fails, the academic branch renders as an error node and the other five agents continue.

   No other signups needed. Core demo runs with only `GROK_API_KEY`.

3. Run the dev server:
   ```
   npx vercel dev
   ```
   **Python function note:** this repo mixes a Next.js app with one Python serverless function (`api/academic-agent.py`). `@vercel/python`'s bundled `uv` toolchain defaults to a cached Python 3.11 interpreter that's incompatible with its own runtime dependency (needs 3.12+), and Homebrew's system Python is blocked by PEP 668. Point `uv` at a pyenv-managed 3.12+ interpreter instead:
   ```
   UV_PYTHON=$(pyenv which python3.12) npx vercel dev
   ```
   (Confirmed working in Phase 0 — see issue #4 for the full root-cause writeup.)

   Plain `next dev` also works if you only need the Node/React side and aren't touching the Python function.

## Repo layout

- `app/` — Next.js App Router pages (the graph canvas UI)
- `lib/orchestration/` — shared query orchestration (`orchestrate()`), imported by both the web app's API route and the MCP server
- `lib/agents/` — the 6 retrieval agents
- `api/academic-agent.py` — the one Python piece: Semantic Scholar-backed academic agent
- `mcp-server/` — MCP server exposing `scout_search` as a Cursor-callable tool. See [`mcp-server/README.md`](mcp-server/README.md) for local stdio config.
- `demo/index.html` — standalone visual mockup of the graph canvas; reference for Phase 7/8's real implementation
- `docs/adr/` — architecture decisions (read before touching orchestration, retrieval, or layout)
