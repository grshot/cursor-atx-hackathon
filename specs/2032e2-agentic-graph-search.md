```
prefix: 2032e2
title: Scout — Cursor hackathon MVP
issue: none
jira: none
requester: Viren Khandal
assignee: Viren Khandal
consumer: standalone hackathon demo (Cursor-sponsored hackathon judging)
model / component: new project — Next.js web app, Python serverless function, MCP server
links: none
```

## Goal

**Scout** — a search product where the primary interface is a live-populating node-edge graph, not a results list. A query produces a center node holding an AI-synthesized answer, surrounded by branch nodes that are peers of that answer rather than footnotes to it — each branch is itself a synthesized mini-answer backed by real citations, expandable into its raw sources. Two toggleable layouts read the same underlying result set: by-source (web / X / academic) and by-subtopic (query angle). The same search orchestration is also callable as an MCP tool from inside Cursor's agent chat, satisfying the hackathon's Cursor-integration requirement. Grok 4.6 is the reasoning and retrieval engine throughout, not a bolted-on option.

## Definition of Done

- [ ] Submitting a query in the web app immediately shows a pulsing center node, then streams in branch nodes live as each of the 6 agents resolves (no wait-for-all blocking render)
- [ ] All 6 agents run per query, fixed fan-out, no adaptive scaling:
  - [ ] 2 source-agents (web via Grok `web_search`, X via Grok `x_search`), each run across the same 3 sub-queries
  - [ ] 1 academic agent (Semantic Scholar API) implemented as a Python Vercel serverless function, run across the same 3 sub-queries
  - [ ] 3 query-agents, each one of the 3 sub-query angles run via Grok `web_search`
- [ ] Each agent renders as exactly one collapsed branch node (synthesized mini-answer + citation count); clicking it expands an outer ring of its raw individual results (pages / X posts / papers)
- [ ] Once all 6 agents complete, one final Grok synthesis call populates the center node's answer
- [ ] A toggle switches the same result set between by-source and by-subtopic layouts without re-querying
- [ ] The orchestration (sub-query generation → 6-agent fan-out → collection → synthesis) lives in one shared TypeScript module, imported by both the Next.js API route and the MCP server — not duplicated
- [ ] An MCP server exposes the orchestration as a callable tool and is invocable from Cursor's agent chat, returning the graph result (nodes/edges/citations) as structured content
- [ ] A failed agent renders as an error-state node and does not block the other 5 agents or the final synthesis
- [ ] App runs locally (`next dev`) end-to-end with a real xAI API key and no other required signups

## Why not X

- **Cursor Canvas (`.canvas.tsx` live-file render)** — real capability (confirmed via `cursor/cookbook`'s dag-task-runner example: a local script overwrites a `.tsx` file, Cursor hot-recompiles it), but IDE-local only (no shareable URL), constrained to Cursor's own `cursor/canvas` component primitives + hand-rolled SVG (no confirmed path to importing React Flow or similar), and the official docs page 404s. Too much unfamiliar, thinly-documented surface for a 5-hour budget. Deferred to stretch-only.
- **Cursor SDK "send to a live coding agent" hand-off** — strong builder-persona payoff (graph finding → real Cursor Cloud Agent scaffolds it) but coding-agent runs take unpredictable minutes, which is risky to demo live. Stretch-only, attempted only if the core app and MCP server are done early.
- **Cursor skill (markdown-only)** — cannot render the graph; skills are text instructions with no UI surface. Rejected outright.
- **MCP server as the only interface** — would reduce the product to a search API for other agents to call, contradicting the core thesis that the graph is the primary human-facing interface. MCP is additive, not a replacement for the web app.
- **Tavily / generic SERP API for web search** — superseded: Grok's built-in `web_search` tool covers this natively through the same xAI key already in use, removing a signup step.
- **Mocking X data** — superseded: Grok's built-in `x_search` tool does real X/Twitter keyword, semantic, user, and thread search server-side, so X is a live source, not a mock.

## Architecture

```
                         ┌─────────────────────────┐
                         │  shared orchestration    │
                         │  (TypeScript module)     │
                         │                          │
  query ──────────────►  │  1. Grok: gen 3 sub-Qs   │
                         │  2. fan out 6 agents:    │
                         │     - web agent (Grok    │
                         │       web_search x3 Qs)  │
                         │     - X agent (Grok      │
                         │       x_search x3 Qs)    │
                         │     - academic agent     │
                         │       (Python fn, Semantic│
                         │        Scholar, x3 Qs)   │
                         │     - 3x query agents    │
                         │       (Grok web_search,  │
                         │        1 Q each)         │
                         │  3. each agent -> 1 node │
                         │     (synthesis + cites)  │
                         │  4. after all 6: final   │
                         │     Grok synthesis ->    │
                         │     center node answer   │
                         └───────────┬──────────────┘
                                     │  imported by both
                 ┌───────────────────┴───────────────────┐
                 ▼                                        ▼
   Next.js API route (SSE)                     MCP server (TS SDK)
   pushes node/edge events as                  exposes orchestration as
   each agent resolves                         one callable tool
                 │                                        │
                 ▼                                        ▼
   React Flow canvas (web app)                 Cursor agent chat
   - center node pulses, then fills            - tool call returns graph
   - branch nodes fade/scale in live             result as structured
   - toggle: by-source / by-subtopic             content
   - click branch -> expand raw leaf nodes
```

Academic agent runs as an isolated Vercel Python serverless function (single external call to Semantic Scholar, no shared state) — the one deliberately Python piece; everything else is TypeScript.

## Out of scope

- Auth, user accounts, saved search history, persistence/database
- Multi-turn conversational refinement (single query → single graph per session)
- Adaptive/dynamic agent scaling (fan-out counts are hard-coded at 6)
- Incremental revision of the center answer as agents stream in (single final synthesis pass only)
- Deep error handling / retries (a failed agent renders an error node and is otherwise ignored)
- Automated test suite

## Sizing rationale

Hard 5-hour build budget (hackathon), partially spent on design already. Every scope cut above trades completeness for a working, demoable core loop: query → live graph → toggle → drill-down → Cursor-callable via MCP. Fixed (non-adaptive) fan-out and single-pass synthesis remove open-ended orchestration complexity that isn't verifiable in the time available.

## Open Questions

- Exact SSE event schema (event names/payload shape for `branch_node_added`, `center_updated`, `agent_error`) — to be defined at implementation time, not blocking the spec.
- MCP server tool name/input schema (single `scout_search(query: string)` tool, or split by source/subtopic mode?) — default to a single tool unless implementation reveals a reason to split.
- Layout algorithm for toggling between by-source and by-subtopic views (force-directed re-layout vs. two precomputed static layouts) — implementer's call, no UX requirement beyond "the same nodes, regrouped."
- Whether the stretch goals (Cursor Canvas render, Cursor SDK hand-off button) get attempted depends entirely on remaining time after the Definition of Done items above are met — not planned for up front.
