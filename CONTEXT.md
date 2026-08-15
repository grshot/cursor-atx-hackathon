# Scout

A query-to-graph search product: six retrieval agents fan out into branch nodes around one synthesized center node. Cursor’s host agent already indexes the workspace; this product searches the web, X, and academic papers.

## Language

**Query snapshot**:
One `orchestrate()` run and the node/edge set it produced. Identity is the `queryId`.
_Avoid_: session, conversation, history

**Branch node**:
One of the six agent mini-answers (web, X, academic, or a query-angle agent). Peers of the center, not footnotes.
_Avoid_: result, hit, footnote, snippet

**Center node**:
The final synthesized answer, filled only after all six branch agents settle.
_Avoid_: summary card, hero result

**Retrieval provider**:
Grok’s server-side `web_search` and `x_search` tools. Not a generic chat completion.
_Avoid_: LLM search, SERP, Tavily

**Reasoning provider**:
The `complete()` adapter used for sub-query generation and center synthesis. Defaults to Grok 4.6; OpenAI-compatible swap is allowed here only.
_Avoid_: the model, the LLM (when you mean this seam)

**Extractor**:
Deterministic platform features parsed from a citation payload (X engagement, paper abstract, web domain). Degrades to `unavailable` when fields are missing.
_Avoid_: scraper, enricher, crawler

**Smart tag**:
A short topic label assigned to a branch after fan-out, plus a `parentConcept` used for depth layout.
_Avoid_: keyword, hashtag, embedding

**Relationship edge**:
A typed link between two branch nodes: `agrees_with`, `contradicts`, `elaborates`, or `same_topic`. Distinct from center-to-branch edges.
_Avoid_: similarity link, affinity, correlation

**Depth layer**:
Layout rank in the hierarchical view: 0 = concept cluster, 1 = branch answer, 2 = citation leaf.
_Avoid_: zoom, zoom level, hierarchy level (say depth layer)

**Host agent**:
The Cursor chat agent that calls the MCP tool. It already has TurboPuffer `semSearch` and Merkle-synced codebase indexing.
_Avoid_: Cursor SDK agent (that is the deferred coding-agent hand-off), coding agent

**QueryId**:
Stable id for one query snapshot. The Merkle analogue: layouts are views over the same ids; they do not re-query.
_Avoid_: commit SHA (that is Cursor’s index, not ours)

## Flagged ambiguities

**Agent** means one of the six fan-out workers in this product, not Cursor’s host agent and not a LangChain AgentExecutor. Say **host agent** or **branch agent** when the listener could mix them up.

**Orchestration** means the owned TypeScript DAG in `orchestrate()`. It does not mean LangChain, LangGraph, or Langfuse. Langfuse traces the DAG; it does not run it.

## Example dialogue

Dev: A judge types a query in Cursor. What runs?

Domain: The **host agent** may `semSearch` the repo via TurboPuffer. In parallel it can call MCP `scout_search`, which starts a **query snapshot**.

Dev: Does that snapshot include repo chunks?

Domain: No. Branch nodes are world search. The host agent already has the repo.

Dev: After the six **branch agents** return, why is there another Grok call before the **center node** fills?

Domain: That’s the **reasoning provider** synthesizing. Stretch also runs **extractors** and one tagging pass so we can draw **relationship edges** and a **depth layer** layout without a seventh retrieval agent.
