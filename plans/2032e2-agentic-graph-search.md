```
prefix: 2032e2
title: Agentic Graph Search — Cursor hackathon MVP
issue: none
jira: none
requester: Viren Khandal
assignee: Viren Khandal
consumer: standalone hackathon demo (Cursor-sponsored hackathon judging)
model / component: new project — Next.js web app, Python serverless function, MCP server
links: none
spec: /Users/virenkhandal/hackathons/cursor-atx-hackathon/specs/2032e2-agentic-graph-search.md
description: Live-populating node-edge graph search app (Grok-powered 6-agent fan-out) with a shared TS orchestration module callable from both a Next.js SSE API route and an MCP server, split into 3 parallel teammate tracks after a shared-contracts phase.
```

## Team split

- **Viren** — Phase 0, Phase 1, Phase 9 (contracts up front, integration at the end)
- **Teammate A** — Phase 2, Phase 3 (orchestration engine: sub-query gen, source agents, query agents, synthesis, fan-out)
- **Teammate B** — Phase 4, Phase 5 (academic agent, MCP server)
- **Teammate C** — Phase 6, Phase 7, Phase 8 (SSE API route, graph canvas, toggle + drill-down)

Phases 2–8 touch disjoint files and can be built in parallel once Phase 1 merges. Each track only needs the stub contracts from Phase 1, not another track's real implementation.

Architecture decisions that constrain all phases live in `docs/adr/` (0001–0005) and `CONTEXT.md`. Stretch Phases 10–12 are listed after Phase 9 and must not change the 6-agent DAG.

## Phase 0 — Pre-implementation: Decisions & Sanity Checks

**PR:** _(none — no code merged this phase)_
**Goal:** Resolve the spec's open questions and confirm the three external calls actually work before 3 people start building on top of them.
**Estimated diff:** 0 lines (decisions + throwaway scratch scripts only, nothing committed to the app)

### Checklist
- [ ] Confirm `next dev` + a Python file under `api/` both run locally via `vercel dev` (mixed-runtime project works)
- [ ] Scratch-test Grok `web_search` tool call with the real xAI key — confirm request/response shape
- [ ] Scratch-test Grok `x_search` tool call with the real xAI key — confirm request/response shape
- [ ] Scratch-test Semantic Scholar API call (no auth required) — confirm response shape for a sample query
- [ ] Decide + write down SSE event schema: `center_pulse`, `branch_node_added`, `center_updated`, `agent_error`, `done`
- [ ] Decide + write down MCP tool schema: single tool `agentic_graph_search(query: string)` returning `{ nodes, edges, citations }`
- [ ] Decide layout algorithm: two precomputed static position sets (by-source, by-subtopic) computed client-side from the same node list — toggle swaps `node.position`, no re-query
- [ ] Decide the common `AgentResult` shape all 6 agents must return: `{ synthesis: string, citations: Citation[], citationCount: number }`

### Definition of Done
- [ ] All 4 scratch tests succeeded against real APIs (xAI key, Semantic Scholar)
- [ ] Mixed Next.js + Python Vercel dev setup confirmed working locally
- [ ] SSE schema, MCP tool schema, layout approach, and `AgentResult` shape are written down (in the PR description of Phase 1) so Phase 2–8 owners aren't blocked on a design call mid-build

> **Note to implementing agent:** run `/compact` after this phase merges. Before compacting, retain in working notes:
> - Exact `AgentResult` shape: `{ synthesis: string, citations: Citation[], citationCount: number }`
> - Exact SSE event names and payload shapes for `center_pulse`, `branch_node_added`, `center_updated`, `agent_error`, `done`
> - MCP tool name and signature: `agentic_graph_search(query: string) -> { nodes, edges, citations }`
> - Layout decision: two precomputed static position sets, toggle-only (no re-fetch)
> - Any surprises from the Grok `web_search`/`x_search` scratch calls (exact param names, citation field names in the response) — Phase 2 needs this verbatim
> - Semantic Scholar response field names — Phase 4 needs this verbatim

## Phase 1 — Scaffold & Shared Contracts

**PR:** _(link once opened)_
**Goal:** Stand up the repo skeleton and shared type/interface contracts so all 3 teammate tracks can start Phase 2/4/6 immediately against stubs.
**Estimated diff:** ~250 lines across 10 files

### Checklist
- [ ] `package.json`, `tsconfig.json`, `next.config.ts` — Next.js app scaffold (App Router)
- [ ] `app/layout.tsx`, `app/page.tsx` — placeholder shell page
- [ ] `lib/types.ts` — `GraphNode`, `GraphEdge`, `Citation`, `AgentResult`, `GraphEvent` (discriminated union per Phase 0 SSE schema)
- [ ] `lib/orchestration/orchestrate.ts` — stub `async function* orchestrate(query: string): AsyncGenerator<GraphEvent>` yielding hardcoded fake events (unblocks Phase 6/5)
- [ ] `lib/agents/agentRunner.ts` — empty exported shape (`AgentResult`) + TODO for Teammate A to fill in
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
> - `agentRunner.ts` location/shape that Teammate A is expected to fill in during Phase 2
> - `api/academic-agent.py` stub request/response contract (what JSON shape Teammate B's Phase 4 must preserve so Phase 3's `orchestrate()` doesn't need changes later)
> - MCP server scaffold location (`mcp-server/`) for Phase 5

## Phase 2 — Orchestration: Sub-query Generation & Source Agents

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

**PR:** _(link once opened)_
**Goal:** Expose `orchestrate()` as a single MCP tool callable from Cursor's agent chat, returning the full graph result as structured content.
**Estimated diff:** ~180 lines across 3 files

### Checklist
- [ ] `mcp-server/index.ts` — MCP TS SDK server exposing one tool: `agentic_graph_search(query: string)`
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

**PR:** _(link once opened)_
**Goal:** HTTP endpoint that drains `orchestrate()` and streams each event to the client as SSE.
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

**PR:** _(link once opened)_
**Goal:** The primary graph UI — query input, pulsing center node, branch nodes fading/scaling in live as SSE events arrive.
**Estimated diff:** ~350 lines across 6 files

### Checklist
- [ ] `components/SearchInput.tsx` — query submission UI
- [ ] `hooks/useSearchStream.ts` — connects to `/api/search`, parses SSE events, exposes live node/edge state
- [ ] `components/GraphCanvas.tsx` — React Flow canvas wiring nodes/edges from `useSearchStream`
- [ ] `components/CenterNode.tsx` — pulsing state before synthesis, filled state after `center_updated`
- [ ] `components/BranchNode.tsx` — collapsed state (synthesis + citation count), error state for `agent_error`
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

**PR:** _(link once opened)_
**Goal:** By-source/by-subtopic layout toggle over the same result set, plus click-to-expand into raw per-agent sources.
**Estimated diff:** ~200 lines across 3–4 files

### Checklist
- [ ] `lib/layout.ts` — two pure functions computing node positions: by-source (grouped by `agentType` category) and by-subtopic (grouped by sub-query index)
- [ ] `components/LayoutToggle.tsx` — UI toggle switching between the two layouts without re-querying
- [ ] `components/BranchNode.tsx` — add click handler that expands an outer ring of raw leaf nodes (pages / X posts / papers) from that agent's citations
- [ ] `components/GraphCanvas.tsx` — wire toggle + expand state into the existing live-streaming canvas from Phase 7
- [ ] Open PR and verify toggling re-arranges the same node set instantly, and clicking a branch reveals its raw sources

### Definition of Done
- [ ] Toggling between by-source and by-subtopic re-positions the same nodes with no network request
- [ ] Clicking a branch node expands an outer ring of its raw individual citations
- [ ] This satisfies the spec's full client-facing Definition of Done except final integration testing

> **Note to implementing agent:** this is the final UI phase — no `/compact` needed, but leave a note for Phase 9 on: any known rough edges in the toggle/expand interaction, and the exact `agentType` → layout-group mapping used (Phase 9 will sanity-check this against Phase 3's actual `agentType` values).

## Phase 9 — Integration & End-to-End Verification

**PR:** _(link once opened)_
**Goal:** Confirm all 3 tracks compose correctly and the full spec Definition of Done holds end-to-end with a real xAI key.
**Estimated diff:** ~50 lines across 2–3 files (glue fixes only — no new features)

### Checklist
- [ ] Run `next dev` (or `vercel dev`) locally end-to-end with a real xAI API key, no other signups
- [ ] Submit a real query in the web app; confirm pulsing center node → live branch streaming → final center synthesis
- [ ] Confirm toggle between by-source/by-subtopic re-layouts the same result set
- [ ] Confirm clicking a branch node expands raw sources
- [ ] Confirm a forced agent failure renders an error-state node without blocking the rest
- [ ] Call the MCP tool from Cursor's agent chat against the real orchestration and confirm structured content is returned
- [ ] Fix any contract mismatches surfaced between tracks (e.g. `agentType` naming drift between Phase 3 and Phase 8)
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

## Decisions (ADRs)

Recorded in `docs/adr/` and domain language in `CONTEXT.md`. Do not re-litigate these during Phases 0–9.

- [ADR-0001](../docs/adr/0001-compose-cursor-retrieval.md) — compose with Cursor TurboPuffer/`semSearch`; do not clone Merkle/TurboPuffer
- [ADR-0002](../docs/adr/0002-grok-retrieval-reasoning-adapter.md) — Grok-only retrieval; capability-flagged reasoning adapter
- [ADR-0003](../docs/adr/0003-langfuse-optional-not-langchain.md) — optional Langfuse tracing; not LangChain
- [ADR-0004](../docs/adr/0004-enrichment-not-extra-agents.md) — extractors + one tagging pass; not a 7th agent
- [ADR-0005](../docs/adr/0005-hierarchical-depth-layout.md) — by-depth is a third layout, not adaptive fan-out

## Deferred / post-rollout

- [ ] Cursor Canvas (`.canvas.tsx` live-file render) — stretch-only, not scheduled
- [ ] Cursor SDK "send to a live coding agent" hand-off — stretch-only, attempt only if Phase 9 finishes early

Attempt Phases 10–12 only after Phase 9 (or when explicitly skipping ahead). They must not change the 6-agent DAG, must not require signups beyond `XAI_API_KEY` for the core demo, and must not add LangChain.

## Phase 10 — Optional Langfuse tracing (stretch)

**PR:** _(link once opened)_
**Goal:** Trace each query snapshot (sub-queries, 6 agents, synthesis) in Langfuse when env keys are set; no-op otherwise. ADR-0003.
**Estimated diff:** ~150 lines across `lib/observability/tracer.ts` plus a thin wrap in `orchestrate()`
**Depends on:** Phase 9 (or skip-ahead)

### Checklist
- [ ] `lib/observability/tracer.ts` — `Tracer`, `NoopTracer`, `LangfuseTracer` (manual nested spans, flush on `done`)
- [ ] `createTracer()` returns noop unless `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY` are set
- [ ] `orchestrate()` opens root span `agentic_graph_search`, child spans `subquery` / `agent:web` / `agent:x` / `agent:academic` / `agent:q1..q3` / `enrichment` / `synthesis`
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

- **Contract drift between tracks** — if Teammate A changes `AgentResult` or `GraphEvent` shape after Phase 1 without telling B/C → their in-flight phases break silently. If this happens, patch in Phase 9 rather than blocking a track mid-build.
- **Grok tool-call latency** — if 6 concurrent Grok/Semantic Scholar calls take long enough to make the "live streaming" UX feel like a single blocking wait → revisit in Phase 9, consider staggering agent start order so the fastest source lands first.
- **Vercel Python + Next.js dev-mode friction** — if `vercel dev` doesn't cleanly run both runtimes together (surfaced in Phase 0) → fall back to running the Python function as a separate local process Phase 4 owner curls directly, wire through Vercel only for the demo deploy.
- **3 people blocked simultaneously on Phase 1** — if Phase 1 runs long, the whole team stalls. If it's not merged within the first ~45 minutes, ship the stub contracts as a shared gist/doc so A/B/C can start against agreed shapes before the scaffold PR lands.
