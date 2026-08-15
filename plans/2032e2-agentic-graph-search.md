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
spec: /Users/virenkhandal/hackathons/cursor-atx-hackathon/specs/2032e2-agentic-graph-search.md
description: Scout — live-populating node-edge graph search (Grok-powered 6-agent fan-out) with one shared TS orchestration module powering two entry points (Next.js web app, MCP server), split 3 ways by entry-point ownership after a shared-contracts phase.
```

## Product name

The product is now called **Scout**. Two entry points share one orchestration core:

1. **Web app** (Next.js on Vercel) — the primary human-facing graph UI.
2. **MCP server** — the same orchestration exposed as a tool callable from Cursor's agent chat.

**Backend language reaffirmed as TypeScript.** The web app's backend stays a Next.js API route (SSE) importing the same `orchestrate()` module the MCP server imports — not a separate FastAPI service. Python stays scoped to the isolated academic-agent serverless function, per ADR-0002 and CONTEXT.md's "owned TypeScript DAG." A FastAPI web backend was considered and rejected for this build: it would either duplicate orchestration logic in Python or add an HTTP hop between the web app and the TS orchestration/MCP layer, neither of which fits the 5-hour budget or the spec's "one shared module, not duplicated" requirement.

## Team split

- **Viren** — shared orchestration core + integration: Phase 0, 1, 2, 3, 9
- **Teammate A** — web app entry point, end-to-end: Phase 6, 7, 8
- **Teammate B** — MCP server entry point, end-to-end (+ academic agent): Phase 4, 5

Phases 2–8 touch disjoint files and can be built in parallel once Phase 1 merges. Teammate A and Teammate B only need the stub contracts from Phase 1 (fake `orchestrate()` generator, mock academic-agent JSON) to start immediately — they swap over to Viren's real Phase 2/3 orchestration once it lands, with no interface changes on their end.

Architecture decisions that constrain all phases live in `docs/adr/` (0001–0005) and `CONTEXT.md`. `demo/index.html` is the visual/interaction reference for the graph canvas (see Phase 7/8 for exactly what to port from it). Stretch Phases 10–12 are listed after Phase 9 and must not change the 6-agent DAG.

## Phase 0 — Pre-implementation: Decisions & Sanity Checks

**PR:** _(none — no code merged this phase)_
**Goal:** Resolve the spec's open questions and confirm the three external calls actually work before 3 people start building on top of them.
**Estimated diff:** 0 lines (decisions + throwaway scratch scripts only, nothing committed to the app)

Full results/rationale: [issue #4](https://github.com/grshot/cursor-atx-hackathon/issues/4).

### Checklist
- [x] Confirm `next dev` + a Python file under `api/` both run locally via `vercel dev` (mixed-runtime project works) — confirmed; needs `UV_PYTHON` pinned to a pyenv-managed 3.12+ interpreter (Homebrew's is PEP-668-blocked), otherwise `@vercel/python`'s bundled `uv` defaults to an incompatible 3.11.14
- [x] Scratch-test Grok `web_search` tool call with the real xAI key — confirm request/response shape — confirmed; `POST https://api.x.ai/v1/responses`, citations come from `output[].content[].annotations` (`url_citation`), not the top-level `citations` field (was `null`); no real titles/snippets, just URL + numeric label. ~35s latency, ~$0.99/call
- [x] Scratch-test Grok `x_search` tool call with the real xAI key — confirm request/response shape — confirmed; same shape, tool-call step type is `custom_tool_call` (not `x_search_call`). ~47s latency, ~$0.36/call
- [ ] Scratch-test Semantic Scholar API call (no auth required) — confirm response shape for a sample query — MIXED: anonymous single-paper lookup works (200), anonymous `/search` is 429-rate-limited from this environment, and the provided `SEMANTIC_SCHOLAR_API_KEY` returns 403 — needs a working key before Phase 4
- [x] Decide + write down SSE event schema: `center_pulse`, `branch_node_added`, `center_updated`, `agent_error`, `done`
- [x] Decide + write down MCP tool schema: single tool `scout_search(query: string)` returning `{ nodes, edges, citations }`
- [x] Decide layout algorithm: two precomputed static position sets (by-source, by-subtopic) computed client-side from the same node list — toggle swaps `node.position`, no re-query. Uses `demo/index.html`'s `computeLayout()` approach (runtime-measured, overlap-safe hex-ring), plus its fixed arbitrary-pairing scheme for the 3-vs-3 clustering (see issue #4 for the honesty caveat on aggregate vs. query agents).
- [x] Decide the common `AgentResult` shape all 6 agents must return — revised from placeholder based on the real Grok response (no titles/snippets available): `{ synthesis: string, citations: { url: string, title: string, source: 'web'|'x'|'academic' }[], citationCount: number }`; `title` is derived (real title from Semantic Scholar when available, else URL hostname)
- [x] Record backend-language decision: Next.js API route + shared TS `orchestrate()` for the web app, no FastAPI; Python scoped only to the academic agent

### Definition of Done
- [ ] All 4 scratch tests succeeded against real APIs (xAI key, Semantic Scholar) — 3/4 clean; Semantic Scholar key still 403s as of last check, likely activation delay on S2's side (ruled out header/corruption/endpoint on our end) — does not block Phase 1, only Phase 4 (Teammate B should retry when starting that phase)
- [x] Mixed Next.js + Python Vercel dev setup confirmed working locally
- [x] SSE schema, MCP tool schema, layout approach, and `AgentResult` shape are written down (in the PR description of Phase 1) so Phase 2–8 owners aren't blocked on a design call mid-build

Phase 0 is otherwise closed out — proceeding to Phase 1.

> **Note to implementing agent:** run `/compact` after this phase merges. Before compacting, retain in working notes:
> - Exact `AgentResult` shape: `{ synthesis: string, citations: Citation[], citationCount: number }`
> - Exact SSE event names and payload shapes for `center_pulse`, `branch_node_added`, `center_updated`, `agent_error`, `done`
> - MCP tool name and signature: `scout_search(query: string) -> { nodes, edges, citations }`
> - Layout decision: two precomputed static position sets (hex-ring, runtime-measured per `demo/index.html`), toggle-only (no re-fetch)
> - Any surprises from the Grok `web_search`/`x_search` scratch calls (exact param names, citation field names in the response) — Phase 2 needs this verbatim
> - Semantic Scholar response field names — Phase 4 needs this verbatim

## Phase 1 — Scaffold & Shared Contracts

**PR:** _(link once opened)_
**Goal:** Stand up the repo skeleton and shared type/interface contracts so all 3 teammate tracks can start Phase 2/4/6 immediately against stubs.
**Estimated diff:** ~250 lines across 10 files

### Checklist
- [ ] `package.json`, `tsconfig.json`, `next.config.ts` — Next.js app scaffold (App Router)
- [ ] `app/layout.tsx`, `app/page.tsx` — placeholder shell page, titled "Scout"
- [ ] `lib/types.ts` — `GraphNode`, `GraphEdge`, `Citation`, `AgentResult`, `GraphEvent` (discriminated union per Phase 0 SSE schema)
- [ ] `lib/orchestration/orchestrate.ts` — stub `async function* orchestrate(query: string): AsyncGenerator<GraphEvent>` yielding hardcoded fake events (unblocks Phase 6/5)
- [ ] `lib/agents/agentRunner.ts` — empty exported shape (`AgentResult`) + TODO for Viren to fill in during Phase 2
- [ ] `api/academic-agent.py` — stub Vercel Python function returning a hardcoded mock `AgentResult` JSON (unblocks Teammate B without waiting)
- [ ] `.env.local.example` — `XAI_API_KEY` placeholder
- [ ] `README.md` — setup steps (`vercel dev`, required env vars, no other signups)
- [ ] `mcp-server/` — empty package scaffold (`package.json`, `tsconfig.json`) for Phase 5
- [ ] Open PR and confirm `next dev` (or `vercel dev`) boots with the placeholder page

### Definition of Done
- [ ] `next dev` boots locally with no errors
- [ ] `orchestrate()` stub is importable and yields fake `GraphEvent`s end-to-end
- [ ] `api/academic-agent.py` stub returns valid mock JSON when curled locally
- [ ] All 3 teammates have pulled this branch and confirmed they can start their phase against the stubs

> **Note to implementing agent:** run `/compact` after this phase merges. Before compacting, retain in working notes:
> - Exact `orchestrate()` export signature and file path (`lib/orchestration/orchestrate.ts`) — Phases 3, 6, 9 all import this
> - Exact `GraphEvent`/`GraphNode`/`GraphEdge`/`Citation`/`AgentResult` field names from `lib/types.ts` — every phase depends on these staying stable
> - `agentRunner.ts` location/shape that Viren is expected to fill in during Phase 2
> - `api/academic-agent.py` stub request/response contract (what JSON shape Teammate B's Phase 4 must preserve so Phase 3's `orchestrate()` doesn't need changes later)
> - MCP server scaffold location (`mcp-server/`) for Phase 5

## Phase 2 — Orchestration: Sub-query Generation & Source Agents

**Owner:** Viren
**PR:** _(link once opened)_
**Goal:** Real sub-query generation plus the web and X source agents, each conforming to the shared `AgentResult` contract.
**Estimated diff:** ~220 lines across 4 files

### Checklist
- [ ] `lib/orchestration/subquery.ts` — Grok call that generates the 3 sub-query angles from the user query
- [ ] `lib/agents/agentRunner.ts` — shared helper: fire a Grok tool call (`web_search` or `x_search`), parse citations out of the response, produce a mini-synthesis → returns `AgentResult`
- [ ] `lib/agents/webAgent.ts` — runs `agentRunner` with `web_search` across the same 3 sub-queries
- [ ] `lib/agents/xAgent.ts` — runs `agentRunner` with `x_search` across the same 3 sub-queries
- [ ] Open PR and manually verify `webAgent`/`xAgent` return real `AgentResult`s for a sample query

### Definition of Done
- [ ] `webAgent` and `xAgent` both return real citations (not mocked) for a test query
- [ ] `agentRunner` is reusable as-is by the 3 query-agents in Phase 3 (single Grok `web_search` call, 1 sub-query)

> **Note to implementing agent:** run `/compact` after this phase merges. Before compacting, retain in working notes:
> - `agentRunner(tool, subQueries)` exact signature — Phase 3's query agents call this with a single-element `subQueries` array and `tool: 'web_search'`
> - Actual field names Grok returns citations under (from the real API response, not the scratch test) — needed verbatim for `queryAgent.ts`
> - Any rate-limit / latency behavior observed running 2 agents × 3 sub-queries — relevant to Phase 3's fan-out timing and Phase 9's end-to-end demo timing

## Phase 3 — Orchestration: Query Agents, Synthesis & Fan-out

**Owner:** Viren
**PR:** _(link once opened)_
**Goal:** Wire the 3 query-agents, the final synthesis call, and the real 6-agent fan-out into `orchestrate()`, replacing the Phase 1 stub.
**Estimated diff:** ~200 lines across 3 files

### Checklist
- [ ] `lib/agents/queryAgent.ts` — runs `agentRunner` with `web_search` against exactly 1 sub-query (invoked 3x, once per sub-query angle)
- [ ] `lib/orchestration/synthesis.ts` — final Grok call that takes all 6 `AgentResult`s and produces the center node's synthesized answer
- [ ] `lib/orchestration/orchestrate.ts` — replace stub with real implementation: generate sub-queries → fan out all 6 agents concurrently → yield `branch_node_added` as each resolves → yield `agent_error` for any that fail (without blocking the rest) → after all 6 settle, run final synthesis → yield `center_updated` → yield `done`
- [ ] Open PR and test end-to-end via a throwaway script that drains `orchestrate()` for a sample query

### Definition of Done
- [ ] `orchestrate()` yields exactly 6 `branch_node_added`/`agent_error` events per query, then one `center_updated`, then `done`
- [ ] A single failing agent (simulate by forcing an error) does not block the other 5 or the final synthesis
- [ ] No adaptive fan-out — always exactly 6 agent calls regardless of query

> **Note to implementing agent:** this phase's `orchestrate()` is the real integration point for Phase 6 (API route) and Phase 5 (MCP server). Note for Phase 9: /compact retaining:
> - Final confirmed `orchestrate()` signature and full `GraphEvent` sequence per query
> - Exact `agentType` discriminator values used per branch node (`'web' | 'x' | 'academic' | 'query1' | 'query2' | 'query3'` or whatever was actually used) — Phase 8's by-source/by-subtopic grouping depends on this
> - How agent failures are represented in the event stream (`agent_error` payload shape actually shipped)
> - Observed end-to-end latency for a full query (6 agents + synthesis) — relevant to Phase 7's "pulsing center node" UX and Phase 9's demo timing

## Phase 4 — Academic Agent (Python)

**Owner:** Teammate B
**PR:** _(link once opened)_
**Goal:** Real Semantic Scholar-backed academic agent replacing the Phase 1 stub, conforming to the shared `AgentResult` contract.
**Estimated diff:** ~150 lines across 2 files

### Checklist
- [ ] `api/academic-agent.py` — Vercel Python serverless function: takes 3 sub-queries, calls Semantic Scholar API, synthesizes a mini-answer + citations, returns `AgentResult`-shaped JSON
- [ ] `lib/agents/academicAgent.ts` — TS wrapper that POSTs to `api/academic-agent`, conforms to the same agent interface as `webAgent`/`xAgent`/`queryAgent` so `orchestrate()` treats all 6 uniformly
- [ ] Open PR and verify `academicAgent.ts` returns a real `AgentResult` for a sample query

### Definition of Done
- [ ] `api/academic-agent.py` returns real Semantic Scholar citations (not mocked) for a test query
- [ ] `academicAgent.ts` return shape is indistinguishable from the other 5 agents' `AgentResult`

> **Note to implementing agent:** run `/compact` after this phase merges. Before compacting, retain in working notes:
> - Confirmed request/response JSON shape between `academicAgent.ts` and `api/academic-agent.py`
> - Semantic Scholar field names actually used for citations (title/url/snippet mapping)
> - Any Semantic Scholar rate-limit behavior observed — relevant to Phase 9's live demo reliability

## Phase 5 — MCP Server

**Owner:** Teammate B
**PR:** _(link once opened)_
**Goal:** Expose `orchestrate()` as a single MCP tool callable from Cursor's agent chat, returning the full graph result as structured content — Scout's second entry point.
**Estimated diff:** ~180 lines across 3 files

### Checklist
- [ ] `mcp-server/index.ts` — MCP TS SDK server exposing one tool: `scout_search(query: string)`
- [ ] Tool handler drains `orchestrate(query)` (imported from `lib/orchestration/orchestrate.ts`) to completion, assembles `{ nodes, edges, citations }`, returns as structured content
- [ ] `mcp-server/package.json` — server entry point + start script
- [ ] Local Cursor MCP config snippet documented in `mcp-server/README.md`
- [ ] Open PR and test end-to-end by calling the tool from Cursor's agent chat

### Definition of Done
- [ ] Tool is registered and callable from Cursor's agent chat
- [ ] Tool call returns a well-formed `{ nodes, edges, citations }` structured result for a sample query
- [ ] Server imports `orchestrate()` from the shared module — no duplicated orchestration logic

> **Note to implementing agent:** this is a leaf phase feeding only Phase 9. /compact retaining:
> - Exact MCP tool name/input schema as registered (in case Phase 9 needs to reference it in the demo script)
> - Any deviation from the Phase 0 MCP schema decision, and why

## Phase 6 — Next.js SSE API Route

**Owner:** Teammate A
**PR:** _(link once opened)_
**Goal:** HTTP endpoint that drains `orchestrate()` and streams each event to the client as SSE — the backend half of Scout's web app entry point.
**Estimated diff:** ~120 lines across 1–2 files

### Checklist
- [ ] `app/api/search/route.ts` — POST handler: takes `{ query }`, opens an SSE stream, pushes each `GraphEvent` from `orchestrate()` as it's yielded, closes the stream on `done`
- [ ] Handle client disconnect (abort the underlying `orchestrate()` generator if the SSE connection closes early)
- [ ] Open PR and verify via `curl -N` that events stream incrementally, not all at once

### Definition of Done
- [ ] `curl -N` against the route shows events arriving incrementally as agents resolve, not buffered until the end
- [ ] Route imports `orchestrate()` from the shared module — no duplicated fan-out logic
- [ ] An `agent_error` event does not terminate the stream early

> **Note to implementing agent:** run `/compact` after this phase merges. Before compacting, retain in working notes:
> - Exact SSE framing used (event name / data format) — Phase 7's client-side `EventSource`/fetch-stream parser must match this exactly
> - Route path (`/api/search`) and request body shape (`{ query: string }`)
> - How `agent_error` events are represented on the wire — Phase 7 needs this to render error-state nodes

## Phase 7 — React Flow Canvas: Center + Branch Nodes, Live Streaming

**Owner:** Teammate A
**PR:** _(link once opened)_
**Goal:** The primary graph UI — query input, pulsing center node, branch nodes fading/scaling in live as SSE events arrive. Port the visual/interaction design proven out in `demo/index.html` rather than reinventing it.
**Estimated diff:** ~350 lines across 6 files

### Checklist
- [ ] `components/SearchInput.tsx` — query submission UI
- [ ] `hooks/useSearchStream.ts` — connects to `/api/search`, parses SSE events, exposes live node/edge state
- [ ] `components/GraphCanvas.tsx` — React Flow canvas wiring nodes/edges from `useSearchStream`
- [ ] `components/CenterNode.tsx` — pulsing state before synthesis, filled state after `center_updated`
- [ ] `components/BranchNode.tsx` — collapsed state (synthesis + citation count), error state for `agent_error`
- [ ] Port `demo/index.html`'s intro sequence timing: center pulse first, then branch nodes stagger in with fade + scale (`playIntro()` pattern), not all-at-once
- [ ] Port `demo/index.html`'s SVG connector-line technique: quadratic-bezier lines from center to each branch, redrawn on a rAF loop tracking live `getBoundingClientRect()` position so lines stay glued to nodes mid-animation (`updateLines()`/`animateLinesFor()` pattern) — do not use React Flow's default straight edges if they don't support this
- [ ] `app/page.tsx` — wire `SearchInput` + `GraphCanvas` together
- [ ] Open PR and verify: submitting a query shows a pulsing center node immediately, branch nodes fade in one at a time as agents resolve (no wait-for-all)

### Definition of Done
- [ ] Center node pulses on submit, before any branch node appears
- [ ] Branch nodes appear incrementally, not all at once
- [ ] A failed agent renders as a visibly distinct error-state node
- [ ] Center node fills with the synthesized answer only after all 6 branches have resolved

> **Note to implementing agent:** run `/compact` after this phase merges. Before compacting, retain in working notes:
> - `GraphCanvas`/`CenterNode`/`BranchNode` prop shapes — Phase 8 adds the toggle and click-to-expand on top of these without changing the streaming logic
> - Where node `position` is currently set (likely a naive default layout) — Phase 8 replaces this with the two precomputed layouts from Phase 0
> - `useSearchStream` return shape (node/edge arrays, connection status) that Phase 8 will read from

## Phase 8 — Toggle Layouts & Drill-down Expansion

**Owner:** Teammate A
**PR:** _(link once opened)_
**Goal:** By-source/by-subtopic layout toggle over the same result set, plus click-to-expand into raw per-agent sources.
**Estimated diff:** ~200 lines across 3–4 files

### Checklist
- [ ] `lib/layout.ts` — two pure functions computing node positions: by-source (grouped by `agentType` category) and by-subtopic (grouped by sub-query index). Port `demo/index.html`'s `computeLayout()` approach: measure real rendered card/canvas sizes (`offsetWidth`/`offsetHeight`, not `getBoundingClientRect()` which is skewed by in-flight CSS transforms) and place the 6 nodes on an evenly-spaced hex ring sized from those measurements — do not hand-pick percentage positions, they overlap once real content length varies
- [ ] `components/LayoutToggle.tsx` — UI toggle switching between the two layouts without re-querying
- [ ] Port `demo/index.html`'s synced color-grouping system: one 3-color triad applied consistently to legend chip + node dot + connector line + floating cluster-name caption, keyed to whichever grouping (by-source/by-subtopic) is currently active, so a viewer can tell at a glance which nodes share a category
- [ ] `components/BranchNode.tsx` — add click handler that expands an outer ring of raw leaf nodes (pages / X posts / papers) from that agent's citations
- [ ] `components/GraphCanvas.tsx` — wire toggle + expand state into the existing live-streaming canvas from Phase 7
- [ ] Open PR and verify toggling re-arranges the same node set instantly, and clicking a branch reveals its raw sources

### Definition of Done
- [ ] Toggling between by-source and by-subtopic re-positions the same nodes with no network request, and no two nodes overlap at any viewport width tested
- [ ] Clicking a branch node expands an outer ring of its raw individual citations
- [ ] Cluster/category names stay legible (not hidden behind a card) in both layout modes
- [ ] This satisfies the spec's full client-facing Definition of Done except final integration testing

> **Note to implementing agent:** this is the final UI phase — no `/compact` needed, but leave a note for Phase 9 on: any known rough edges in the toggle/expand interaction, and the exact `agentType` → layout-group mapping used (Phase 9 will sanity-check this against Phase 3's actual `agentType` values).

## Phase 9 — Integration & End-to-End Verification

**Owner:** Viren
**PR:** _(link once opened)_
**Goal:** Confirm both entry points compose correctly against the shared orchestration core and the full spec Definition of Done holds end-to-end with a real xAI key.
**Estimated diff:** ~50 lines across 2–3 files (glue fixes only — no new features)

### Checklist
- [ ] Run `next dev` (or `vercel dev`) locally end-to-end with a real xAI API key, no other signups
- [ ] Submit a real query in the web app; confirm pulsing center node → live branch streaming → final center synthesis
- [ ] Confirm toggle between by-source/by-subtopic re-layouts the same result set with no overlap
- [ ] Confirm clicking a branch node expands raw sources
- [ ] Confirm a forced agent failure renders an error-state node without blocking the rest
- [ ] Call the `scout_search` MCP tool from Cursor's agent chat against the real orchestration and confirm structured content is returned
- [ ] Fix any contract mismatches surfaced between the web app and MCP tracks (e.g. `agentType` naming drift between Phase 3 and Phase 8)
- [ ] Open PR and do a full dry-run of the demo script

### Definition of Done
- [ ] Every item in the spec's Definition of Done (§Definition of Done) is checked off against the running app
- [ ] MCP tool callable from Cursor's agent chat and returns the graph result
- [ ] Full demo dry-run completed without manual workarounds

> This is the final phase — no `/compact` needed.

## Out of scope

- [ ] Auth, user accounts, saved search history, persistence/database
- [ ] Multi-turn conversational refinement
- [ ] Adaptive/dynamic agent scaling
- [ ] Incremental revision of the center answer as agents stream in
- [ ] Deep error handling / retries beyond a single error-state node
- [ ] Automated test suite
- [ ] FastAPI (or any second backend language) fronting the web app — see "Product name" section above

## Decisions (ADRs)

Recorded in `docs/adr/` and domain language in `CONTEXT.md`. Do not re-litigate these during Phases 0–9.

- [ADR-0001](../docs/adr/0001-compose-cursor-retrieval.md) — compose with Cursor TurboPuffer/`semSearch`; do not clone Merkle/TurboPuffer
- [ADR-0002](../docs/adr/0002-grok-retrieval-reasoning-adapter.md) — Grok-only retrieval; capability-flagged reasoning adapter; owned TypeScript DAG (basis for this revision's FastAPI rejection)
- [ADR-0003](../docs/adr/0003-langfuse-optional-not-langchain.md) — optional Langfuse tracing; not LangChain
- [ADR-0004](../docs/adr/0004-enrichment-not-extra-agents.md) — extractors + one tagging pass; not a 7th agent
- [ADR-0005](../docs/adr/0005-hierarchical-depth-layout.md) — by-depth is a third layout, not adaptive fan-out

## Deferred / post-rollout

- [ ] Cursor Canvas (`.canvas.tsx` live-file render) — stretch-only, not scheduled
- [ ] Cursor SDK "send to a live coding agent" hand-off — stretch-only, attempt only if Phase 9 finishes early
- [ ] Serper (Google/Bing SERP API) as a web-agent source — deferred per Phase 0 decision (issue #4). Grok `web_search` already covers web sourcing end-to-end (search + synthesis + citations in one call); Serper doesn't unlock a new source type (X is separately covered by `x_search`) and would add an extra synthesis pass without fixing the actual latency bottleneck (`x_search` at ~47s was slower than `web_search` at ~35s in Phase 0 testing, and has no Serper equivalent). Revisit only if live-demo latency proves to be an actual blocker, not before.

Attempt Phases 10–12 only after Phase 9 (or when explicitly skipping ahead). They must not change the 6-agent DAG, must not require signups beyond `XAI_API_KEY` for the core demo, and must not add LangChain.

## Phase 10 — Optional Langfuse tracing (stretch)

**PR:** _(link once opened)_
**Goal:** Trace each query snapshot (sub-queries, 6 agents, synthesis) in Langfuse when env keys are set; no-op otherwise. ADR-0003.
**Estimated diff:** ~150 lines across `lib/observability/tracer.ts` plus a thin wrap in `orchestrate()`
**Depends on:** Phase 9 (or skip-ahead)

### Checklist
- [ ] `lib/observability/tracer.ts` — `Tracer`, `NoopTracer`, `LangfuseTracer` (manual nested spans, flush on `done`)
- [ ] `createTracer()` returns noop unless `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY` are set
- [ ] `orchestrate()` opens root span `scout_search`, child spans `subquery` / `agent:web` / `agent:x` / `agent:academic` / `agent:q1..q3` / `enrichment` / `synthesis`
- [ ] Academic Python stays uninstrumented; TS wrapper records one HTTP span
- [ ] `.env.local.example` documents optional Langfuse keys; core `next dev` still runs with only `XAI_API_KEY`
- [ ] No LangChain / LangSmith dependency

### Definition of Done
- [ ] With keys unset, behavior is identical to Phase 9 (noop tracer)
- [ ] With keys set, one Langfuse trace per query shows the 6-agent waterfall
- [ ] A failed agent span records error metadata and does not drop the trace

## Phase 11 — Platform extractors, tags, relationship edges (stretch)

**PR:** _(link once opened)_
**Goal:** On top of the existing canvas, attach platform features, smart tags, and typed edges between branch nodes. ADR-0004. Not a 7th retrieval agent.
**Estimated diff:** ~280 lines across extractors, `tagAndRelate.ts`, types, BranchNode chrome
**Depends on:** Phase 9, Phase 10 tracer span `enrichment` if present

### Checklist
- [ ] `lib/enrichment/extractors/x.ts` — `likeToCommentRatio`, likes, replies, handle; `unavailable` if fields missing
- [ ] `lib/enrichment/extractors/academic.ts` — abstract, year, venue, citationCount
- [ ] `lib/enrichment/extractors/web.ts` — domain, title, snippet, published date
- [ ] `lib/enrichment/tagAndRelate.ts` — one `ReasoningProvider.complete()` after all 6 agents: tags, `parentConcept`, pairwise relationship edges
- [ ] Similarity ranking: model score, tag Jaccard as tie-break; leaf sort uses X ratio / academic cite count / else score
- [ ] `GraphEdge.kind` union: `agrees_with` | `contradicts` | `elaborates` | `same_topic` | `center_branch` (existing)
- [ ] UI: dashed relationship edges, tag chips, platform badges on BranchNode; expand still shows ranked leaves
- [ ] Additive events only (`enrichment_updated` or fields on `center_updated`)

### Definition of Done
- [ ] Fan-out remains exactly 6 agents
- [ ] Missing X engagement does not drop the citation (extractor `unavailable`)
- [ ] Toggle by-source / by-subtopic still does not re-query
- [ ] Relationship edges render between branch nodes without replacing center→branch edges

## Phase 12 — Hierarchical DAG by subject depth (stretch)

**PR:** _(link once opened)_
**Goal:** Third layout over the same snapshot: abstract `parentConcept` clusters → branch answers → citation leaves. ADR-0005.
**Estimated diff:** ~120 lines in `lib/layout.ts` + `LayoutToggle`
**Depends on:** Phase 11 (`parentConcept` tags)

### Checklist
- [ ] `layoutByDepth(nodes, edges)` — depth 0 concept nodes (`concept:<slug>`), depth 1 branches, depth 2 expanded leaves
- [ ] Concept nodes are layout-only; no extra Grok calls
- [ ] `LayoutToggle` becomes three-way: by-source | by-subtopic | by-depth
- [ ] If enrichment is missing, by-depth falls back to by-subtopic

### Definition of Done
- [ ] Switching to by-depth repositions the same branch nodes and inserts concept clusters with no network request
- [ ] Fan-out still exactly 6; no adaptive retrieval
- [ ] by-source and by-subtopic still work unchanged

## Risks to watch

- **Viren is a bottleneck on the shared orchestration core** — Phase 2/3 now sit on one person instead of being split off to a teammate. If Phase 2/3 run long, both entry points are stuck testing against the Phase 1 stub. If Phase 2/3 aren't merged within the first ~2 hours, ship `webAgent`/`xAgent` incrementally (e.g. open a draft PR after just `webAgent` lands) rather than holding both entry points back for the full orchestration PR.
- **Contract drift between tracks** — if `AgentResult` or `GraphEvent` shape changes after Phase 1 without telling Teammate A/B → their in-flight phases break silently. If this happens, patch in Phase 9 rather than blocking a track mid-build.
- **Grok tool-call latency** — if 6 concurrent Grok/Semantic Scholar calls take long enough to make the "live streaming" UX feel like a single blocking wait → revisit in Phase 9, consider staggering agent start order so the fastest source lands first.
- **Vercel Python + Next.js dev-mode friction** — if `vercel dev` doesn't cleanly run both runtimes together (surfaced in Phase 0) → fall back to running the Python function as a separate local process Teammate B curls directly, wire through Vercel only for the demo deploy.
- **3 people blocked simultaneously on Phase 1** — if Phase 1 runs long, the whole team stalls. If it's not merged within the first ~45 minutes, ship the stub contracts as a shared gist/doc so Viren/A/B can start against agreed shapes before the scaffold PR lands.
