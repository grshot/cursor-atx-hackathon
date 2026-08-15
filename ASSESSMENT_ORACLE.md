# Assessment oracle

Maps every requirement from GitHub issues **3** (Track: MCP server entry point), **12** (Phase 4 — Academic Agent), and **13** (Phase 5 — MCP Server), plus the protocol obligations in the [MCP specification 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28), to one automated check. A grader or CI can run:

```bash
npm run oracle
```

Runner: Node 25 `node:test` (native TypeScript). Sequential (`--test-concurrency=1`) to avoid FD exhaustion on this host.

**Legend:** `implemented` = real assertions, green · `partial` = real assertions on **current scope**, green, documented gap remains · `deferred` = not built yet → `skip(reason)`, or a known gap/bug → `todo(reason)`. A deferred row never silently passes — it surfaces as skip/todo with its reason.

Supporting artifacts actually in the repo (not conflated with the issues): `plans/2032e2-agentic-graph-search.md` Phases 4–5, `specs/2032e2-agentic-graph-search.md`, `docs/adr/0001`–`0003`, `CONTEXT.md`. Phase 1 stubs (`api/academic-agent.py`, `lib/orchestration/orchestrate.ts`, `mcp-server/package.json`) landed during oracle construction and are treated as current scope, not greenfield.

## Coverage summary

| Status | Count |
|--------|------:|
| implemented | 10 |
| partial | 6 |
| deferred — `skip` (not built) | 91 |
| deferred — `todo` (known gap) | 1 |
| **Total rows** | **108** |

Live counts: `npm run oracle` → `pass 16 · fail 0 · skipped 91 · todo 1`.

---

## Sources and track charter

| id | source | requirement | test | status | notes |
|----|--------|-------------|------|--------|-------|
| SRC-01 | issue 3/12/13 | Issue files for track 3, Phase 4, and Phase 5 are present | `oracle:SRC-01` | implemented | Structural |
| TRK-01 | issue 3 · Track | Second entry point is the academic agent plus an MCP tool callable from Cursor agent chat | `oracle:TRK-01` | implemented | Charter recorded; implementation is AA-* / MCP-* / TRK-02 |
| TRK-02 | issue 3 · Track | Tool is callable from Cursor's agent chat | `oracle:TRK-02` | deferred | skip: `mcp-server/index.ts` not built; Cursor-host E2E not automatable |
| TRK-03 | issue 3 · Track | Track can start against Phase 1 `academic-agent` and `orchestrate()` stubs | `oracle:TRK-03` | implemented | Stubs present: `api/academic-agent.py`, `lib/orchestration/orchestrate.ts`, `mcp-server/package.json` |
| TRK-04 | issue 3 · Track | Swap stub `orchestrate()` for the real Phase 2/3 generator | `oracle:TRK-04` | deferred | skip: still `FAKE_AGENTS` |
| TRK-05 | issue 3 · Track / issue 13 DoD | MCP and web app share one `orchestrate()` module | `oracle:TRK-05` | deferred | skip: stub exists; `mcp-server/index.ts` does not import it |
| NAME-01 | issue 3 + 13 · plan Phase 0/5 · spec · ADR-0001 | Tool name is `scout_search` everywhere | `oracle:NAME-01` | implemented | Living docs and `mcp-server/package.json` agree; earlier `agentic_graph_search` naming is gone |

---

## Academic agent (issue 12 / Phase 4)

| id | source | requirement | test | status | notes |
|----|--------|-------------|------|--------|-------|
| AA-01 | issue 12 · Checklist | `api/academic-agent.py` is a Vercel Python serverless function | `oracle:AA-01` | partial | `handler(BaseHTTPRequestHandler)` + `do_POST` exist; still a Phase 1 stub |
| AA-02 | issue 12 · Checklist | Handler accepts 3 sub-queries | `oracle:AA-02` | deferred | skip: stub ignores POST body |
| AA-03 | issue 12 · DoD | Handler calls Semantic Scholar (not a mock) for a test query | `oracle:AA-03` | deferred | skip: still `MOCK_RESULT` |
| AA-04 | issue 12 · DoD | Response JSON matches `AgentResult` `{synthesis, citations, citationCount}` | `oracle:AA-04` | partial | Stub payload matches `lib/types.ts`; live S2 not wired |
| AA-05 | issue 12 · Checklist | `academicAgent.ts` POSTs to `api/academic-agent` | `oracle:AA-05` | deferred | skip: file not built |
| AA-06 | issue 12 · Checklist | Wrapper uses the same agent interface as web/X/query agents | `oracle:AA-06` | deferred | skip: wrapper and sibling agents not built |
| AA-07 | issue 12 · DoD | Return shape is indistinguishable from the other five `AgentResult`s | `oracle:AA-07` | deferred | skip: same |
| AA-08 | plan Phase 4 · notes | Citations map Semantic Scholar title/url/snippet (or abstract) | `oracle:AA-08` | deferred | skip: fake `example.org` URLs |
| AA-09 | spec · Architecture | Academic function is isolated (no shared process state) | `oracle:AA-09` | partial | Stub has no store; real S2 client isolation unproven |
| AA-10 | spec · DoD / plan Phase 0 | Semantic Scholar path requires no extra signup beyond the xAI key | `oracle:AA-10` | deferred | **todo:** README and `.env.local.example` require `SEMANTIC_SCHOLAR_API_KEY` |
| AA-11 | DESIGN · ADR-0003 | Python academic function stays uninstrumented | `oracle:AA-11` | implemented | No langfuse/OTEL/langchain imports in the stub |
| AA-12 | plan Phase 4 · notes | Request/response contract is stable for `orchestrate()` | `oracle:AA-12` | partial | Stub JSON keys match `AgentResult`; `academicAgent.ts` still missing |

---

## MCP server product (issue 13 / Phase 5)

| id | source | requirement | test | status | notes |
|----|--------|-------------|------|--------|-------|
| MCP-01 | issue 13 · Checklist | `mcp-server/index.ts` uses the official MCP TypeScript SDK | `oracle:MCP-01` | deferred | skip: file not built |
| MCP-02 | issue 13 · Checklist | Server exposes exactly one tool | `oracle:MCP-02` | deferred | skip |
| MCP-03 | issue 13 · Checklist | Registered tool name is `scout_search` | `oracle:MCP-03` | deferred | skip; NAME-01 locks the string |
| MCP-04 | issue 13 · Checklist | `inputSchema` requires `query: string` | `oracle:MCP-04` | deferred | skip |
| MCP-05 | issue 13 · Checklist | Handler drains `orchestrate(query)` to completion | `oracle:MCP-05` | deferred | skip: index missing; orchestrate stub exists |
| MCP-06 | issue 13 · DoD | Assembled payload is `{ nodes, edges, citations }` | `oracle:MCP-06` | deferred | skip |
| MCP-07 | issue 13 · DoD / MCP Tools · Structured Content | Result is returned as `structuredContent` | `oracle:MCP-07` | deferred | skip |
| MCP-08 | issue 13 · Checklist | `mcp-server/package.json` declares a start script | `oracle:MCP-08` | partial | `start` → `dist/index.js`, `"type": "module"`; no source/SDK yet |
| MCP-09 | issue 13 · Checklist | README documents a local Cursor MCP config snippet | `oracle:MCP-09` | deferred | skip: `mcp-server/README.md` not built |
| MCP-10 | issue 13 · DoD | Server imports `orchestrate()` from `lib/orchestration/orchestrate.ts` | `oracle:MCP-10` | deferred | skip |
| MCP-11 | issue 13 · DoD | No duplicated fan-out / orchestration logic | `oracle:MCP-11` | deferred | skip |
| MCP-12 | issue 13 · DoD | Sample `tools/call` returns a well-formed graph payload | `oracle:MCP-12` | deferred | skip |
| MCP-13 | DESIGN · ADR-0001 | MCP search is world-search only (no repo / TurboPuffer chunks) | `oracle:MCP-13` | deferred | skip: behavior untestable until the server exists |
| MCP-14 | DESIGN · ADR-0001 | ADR records world-search-only MCP | `oracle:MCP-14` | implemented | Structural |
| MCP-15 | DESIGN · ADR-0002 | Optional MCP `model` arg is later, not in issue 13 | `oracle:MCP-15` | implemented | Structural |

---

## MCP spec 2026-07-28 — base protocol, versioning, stdio

| id | source | requirement | test | status | notes |
|----|--------|-------------|------|--------|-------|
| PROTO-01 | spec · Basic | Messages are JSON-RPC 2.0 | `oracle:PROTO-01` | deferred | skip: no server |
| PROTO-02 | spec · Basic · Requests | Request ids are string or number, never null | `oracle:PROTO-02` | deferred | skip |
| PROTO-03 | spec · Basic · ResultType | Successful results include `result.resultType` | `oracle:PROTO-03` | deferred | skip |
| PROTO-04 | spec · Basic · Errors | Errors include integer `code` and `message` | `oracle:PROTO-04` | deferred | skip |
| PROTO-05 | spec · Basic · Notifications | Notifications omit `id` | `oracle:PROTO-05` | deferred | skip |
| PROTO-06 | spec · Basic · Statelessness | Server is stateless: each request is self-contained | `oracle:PROTO-06` | deferred | skip |
| PROTO-07 | spec · Basic · `_meta` | Missing required `_meta` (`protocolVersion`, `clientCapabilities`) → `-32602` | `oracle:PROTO-07` | deferred | skip |
| PROTO-08 | spec · Basic · `_meta` | Undeclared required client capability → `-32021` | `oracle:PROTO-08` | deferred | skip |
| PROTO-09 | spec · Basic · `_meta` | Responses SHOULD include `io.modelcontextprotocol/serverInfo` | `oracle:PROTO-09` | deferred | skip |
| VER-01 | spec · Discovery | Server implements `server/discover` | `oracle:VER-01` | deferred | skip · **MUST** |
| VER-02 | spec · Versioning | `discover.supportedVersions` includes `2026-07-28` | `oracle:VER-02` | deferred | skip |
| VER-03 | spec · Versioning | Unsupported version → `-32022` with a `supported` list | `oracle:VER-03` | deferred | skip |
| VER-04 | spec · Discovery | `discover.capabilities` advertises `tools` | `oracle:VER-04` | deferred | skip |
| VER-05 | spec · Versioning · Dual-era | Dual-era `initialize` for legacy Cursor clients | `oracle:VER-05` | deferred | skip: decide dual-era vs modern-only at implementation |
| STDIO-01 | spec · Transports · stdio | Newline-delimited JSON-RPC on stdin/stdout | `oracle:STDIO-01` | deferred | skip · Cursor local MCP |
| STDIO-02 | spec · Transports · stdio | stdout contains only valid MCP messages | `oracle:STDIO-02` | deferred | skip |
| STDIO-03 | spec · Transports · stdio | Logs MAY go to stderr | `oracle:STDIO-03` | deferred | skip |
| STDIO-04 | spec · Transports · stdio | Server SHOULD exit when stdin hits EOF | `oracle:STDIO-04` | deferred | skip |
| STDIO-05 | spec · Basic · Auth | stdio credentials come from the environment, not HTTP OAuth | `oracle:STDIO-05` | deferred | skip |

---

## MCP spec 2026-07-28 — tools and security

| id | source | requirement | test | status | notes |
|----|--------|-------------|------|--------|-------|
| TOOL-01 | spec · Tools · Capabilities | Discover/capabilities declare `tools` | `oracle:TOOL-01` | deferred | skip · **MUST** |
| TOOL-02 | spec · Tools | Server responds to `tools/list` | `oracle:TOOL-02` | deferred | skip · **MUST** |
| TOOL-03 | spec · Tools · Listing | `tools/list` returns the single search tool with name, description, `inputSchema` | `oracle:TOOL-03` | deferred | skip |
| TOOL-04 | spec · Tools · Capabilities | `tools/list` order is deterministic | `oracle:TOOL-04` | deferred | skip · SHOULD |
| TOOL-05 | spec · Tools · Calling | `tools/call` accepts `name` + `arguments` | `oracle:TOOL-05` | deferred | skip |
| TOOL-06 | spec · Tools · Data Types / JSON Schema | `inputSchema` is a JSON Schema object (not null), default dialect 2020-12 | `oracle:TOOL-06` | deferred | skip · **MUST** |
| TOOL-07 | spec · Tools · Tool Names | Name matches `[A-Za-z0-9_.-]{1,128}` | `oracle:TOOL-07` | deferred | skip · SHOULD; `scout_search` already valid |
| TOOL-08 | spec · Tools · Data Types | Tool has a human-readable description | `oracle:TOOL-08` | deferred | skip |
| TOOL-09 | spec · Tools · Structured Content | Graph payload is in `structuredContent` | `oracle:TOOL-09` | deferred | skip |
| TOOL-10 | spec · Tools · Structured Content | Structured result SHOULD also include serialized JSON as text content | `oracle:TOOL-10` | deferred | skip |
| TOOL-11 | spec · Tools · Output Schema | `outputSchema` for `{nodes, edges, citations}` is declared and results conform | `oracle:TOOL-11` | deferred | skip · SHOULD for this product |
| TOOL-12 | spec · Tools · Error Handling | Unknown tool name is protocol error `-32602` | `oracle:TOOL-12` | deferred | skip |
| TOOL-13 | spec · Tools · Error Handling | Orchestration/API failures are tool execution errors (`isError: true`) | `oracle:TOOL-13` | deferred | skip |
| TOOL-14 | spec · Tools · Error Handling / SEP-1303 | Invalid arguments are tool execution or `-32602` errors | `oracle:TOOL-14` | deferred | skip |
| TOOL-15 | spec · Tools · Security | Tool output does not leak API keys | `oracle:TOOL-15` | deferred | skip |
| TOOL-16 | spec · JSON Schema Usage | Server MUST support JSON Schema 2020-12 | `oracle:TOOL-16` | deferred | skip |
| TOOL-17 | spec · Tools · Capabilities | `tools/list` set does not vary per connection | `oracle:TOOL-17` | deferred | skip |
| SEC-01 | spec · Tools · Security | Server validates all tool inputs | `oracle:SEC-01` | deferred | skip · **MUST** |
| SEC-02 | spec · Tools · Security | Access control: stdio process only; no unauthenticated HTTP surface | `oracle:SEC-02` | deferred | skip |
| SEC-03 | spec · Tools · Security | Tool invocations are rate-limited | `oracle:SEC-03` | deferred | skip · **MUST** |
| SEC-04 | spec · Tools · Security | Tool outputs are sanitized | `oracle:SEC-04` | deferred | skip · **MUST** |
| SEC-05 | spec · Security principles | README documents security implications of running the server locally | `oracle:SEC-05` | deferred | skip |
| SEC-06 | spec · Tools · Annotations | Tool annotations, if any, are not treated as trusted policy | `oracle:SEC-06` | deferred | skip |
| CXL-01 | spec · Cancellation | stdio `notifications/cancelled` SHOULD stop an in-flight `orchestrate()` | `oracle:CXL-01` | deferred | skip · long-running tool |
| PROG-01 | spec · Progress | Progress notifications for a long `tools/call` are optional | `oracle:PROG-01` | deferred | skip · OPTIONAL |

---

## Completeness — MCP spec sections not in product scope

Every remaining heading in the 2026-07-28 spec TOC maps here so nothing is silently unaccounted for.

| id | source | requirement | test | status | notes |
|----|--------|-------------|------|--------|-------|
| RES-01 | spec · Server · Resources | Resources primitive is not required | `oracle:RES-01` | deferred | skip: single stdio tool |
| PRMPT-01 | spec · Server · Prompts | Prompts primitive is not required | `oracle:PRMPT-01` | deferred | skip |
| ELIC-01 | spec · Client · Elicitation | Elicitation is not required | `oracle:ELIC-01` | deferred | skip |
| SAMP-01 | spec · Client · Sampling / Deprecated | Sampling is not required | `oracle:SAMP-01` | deferred | skip · deprecated in 2026-07-28 |
| ROOT-01 | spec · Client · Roots / Deprecated | Roots are not required | `oracle:ROOT-01` | deferred | skip · deprecated |
| HTTP-01 | spec · Transports · Streamable HTTP | Streamable HTTP is not required | `oracle:HTTP-01` | deferred | skip: Cursor local MCP is stdio |
| AUTH-01 | spec · Authorization | HTTP OAuth is not required on stdio | `oracle:AUTH-01` | deferred | skip |
| PAG-01 | spec · Pagination | Pagination is not required (one tool) | `oracle:PAG-01` | deferred | skip |
| LOG-01 | spec · Logging / Deprecated | MCP logging utility is not required | `oracle:LOG-01` | deferred | skip |
| COMP-01 | spec · Completion | Argument completion is not required | `oracle:COMP-01` | deferred | skip |
| CACHE-01 | spec · Caching | List-result caching/TTL is not required | `oracle:CACHE-01` | deferred | skip |
| SUB-01 | spec · Subscriptions | `subscriptions/listen` is not required | `oracle:SUB-01` | deferred | skip: static tool list |
| MRTR-01 | spec · MRTR | Multi round-trip / `InputRequiredResult` is not required | `oracle:MRTR-01` | deferred | skip |
| EXT-01 | spec · Extensions | Protocol extensions are not required | `oracle:EXT-01` | deferred | skip |
| REG-01 | spec · Registry | Publishing to the MCP Registry is not required | `oracle:REG-01` | deferred | skip |
| TASK-01 | spec · Extensions · Tasks | Tasks extension is not required | `oracle:TASK-01` | deferred | skip: handler drains `orchestrate()` |
| APPS-01 | spec · Extensions · MCP Apps | MCP Apps UI is not required | `oracle:APPS-01` | deferred | skip |
| DEP-01 | spec · Changelog / Deprecated | Changelog migration is N/A until a server exists | `oracle:DEP-01` | deferred | skip |
| SCHEMA-01 | spec · Schema | Types align with `schema.ts` 2026-07-28 via the official SDK | `oracle:SCHEMA-01` | deferred | skip: SDK not added |

---

## Tech stack, sizing, deliverables (from issues 12/13 + plan)

| id | source | requirement | test | status | notes |
|----|--------|-------------|------|--------|-------|
| TECH-01 | issue 13 · Checklist | MCP TypeScript SDK is the server implementation | `oracle:TECH-01` | deferred | skip: no `@modelcontextprotocol/sdk` in `mcp-server/package.json` |
| TECH-02 | issue 12 · Checklist | Academic agent is Python on Vercel serverless | `oracle:TECH-02` | partial | Handler class present; still mock |
| TECH-03 | issue 12 · Goal | Academic retrieval is Semantic Scholar, not a Grok tool | `oracle:TECH-03` | deferred | skip: still `MOCK_RESULT` |
| TECH-04 | MCP spec 2026-07-28 | Protocol revision targeted is `2026-07-28` | `oracle:TECH-04` | deferred | skip: cannot advertise `supportedVersions` yet |
| TECH-05 | DESIGN · ADR-0003 | No LangChain dependency in MCP or academic packages | `oracle:TECH-05` | implemented | Root + `mcp-server` manifests + Python stub |
| CQ-01 | issue 12 · sizing | Academic agent stays near ~150 lines / 2 files | `oracle:CQ-01` | deferred | skip: size gate once Phase 4 lands |
| CQ-02 | issue 13 · sizing | MCP server stays near ~180 lines / 3 files | `oracle:CQ-02` | deferred | skip: size gate once Phase 5 lands |
| DEL-01 | issue 12 · Checklist | Phase 4 PR opened with a real `AgentResult` sample | `oracle:DEL-01` | deferred | skip |
| DEL-02 | issue 13 · Checklist | Phase 5 PR opened with Cursor agent-chat verification | `oracle:DEL-02` | deferred | skip |
| DESIGN-01 | CONTEXT.md | Host agent is distinct from the MCP tool | `oracle:DESIGN-01` | implemented | `scout_search` named in CONTEXT |
| DESIGN-02 | spec · DoD | Product spec requires MCP structured graph result | `oracle:DESIGN-02` | implemented | `nodes/edges/citations` |

---

## Items not fully automatable

| Item | Why |
|------|-----|
| Callable from Cursor's agent chat (issue 13 DoD / TRK-02) | Needs the Cursor host, user consent UI, and a live MCP config; protocol `tools/call` can be automated later, host wiring cannot |
| Live Semantic Scholar under rate limits (AA-03) | Requires network + optional API key; Phase 0 found anonymous `/paper/search` is rate-limited |
| User consent / tool-invocation UI (MCP Security · User Interaction Model) | Host-side SHOULD; Scout's server cannot enforce it |
| Dual-era vs modern-only Cursor compatibility (VER-05) | Depends on which protocol era the installed Cursor client speaks |
| Performance of a full 6-agent `orchestrate()` behind `tools/call` | Needs live xAI keys and a timing harness |
| README / demo-script prose quality | Subjective review |

---

## Known gaps tracked as `todo` (must-fix, not silent pass)

1. **AA-10** — Spec DoD and Phase 0 said Semantic Scholar needs no extra signup. `README.md` and `.env.local.example` now require `SEMANTIC_SCHOLAR_API_KEY` (free key, but still a second signup). Resolve: drop the required key, or formally amend the spec DoD.

---

## Completeness pass (spec headings → rows)

| Spec / issue heading | Rows |
|----------------------|------|
| Issue 3 track description | TRK-01–05, NAME-01 |
| Issue 12 checklist + DoD | AA-01–08, AA-12, TECH-02–03, CQ-01, DEL-01 |
| Issue 13 checklist + DoD | MCP-01–12, TECH-01, CQ-02, DEL-02, TOOL-09 |
| Plan Phase 4 notes (S2 field mapping, contract) | AA-08, AA-12 |
| Plan Phase 5 / Phase 0 tool schema | NAME-01, MCP-03–07 |
| MCP Architecture | PROTO-06, RES/PRMPT completeness |
| MCP Basic / JSON-RPC / `_meta` | PROTO-01–09 |
| MCP Versioning + Discovery | VER-01–05 |
| MCP stdio transport | STDIO-01–05 |
| MCP Tools (list/call/schema/errors/structured) | TOOL-01–17, MCP-07 |
| MCP Tools security | SEC-01–06, TOOL-15 |
| MCP Cancellation / Progress | CXL-01, PROG-01 |
| MCP JSON Schema 2020-12 | TOOL-06, TOOL-16 |
| MCP Authorization / HTTP | AUTH-01, HTTP-01, STDIO-05 |
| MCP Resources / Prompts / Client features | RES-01, PRMPT-01, ELIC-01, SAMP-01, ROOT-01 |
| MCP utilities + extensions + registry | PAG/LOG/COMP/CACHE/SUB/MRTR/EXT/REG/TASK/APPS/DEP/SCHEMA |
| ADR-0001 world-search | MCP-13, MCP-14 |
| ADR-0002 optional `model` | MCP-15 |
| ADR-0003 no LangChain / uninstrumented Python | TECH-05, AA-11 |
| Spec DoD “no other signups” | AA-10 |
