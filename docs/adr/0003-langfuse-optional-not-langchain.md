# Optional Langfuse tracing; do not adopt LangChain

Need traces of the 6-agent fan-out without a second required signup and without giving up the owned TypeScript DAG.

**Status:** accepted

**Decision:** `Tracer` interface; `NoopTracer` default; Langfuse when `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY` are set. Manual nested observations matching the DAG (root `agentic_graph_search`, child spans per agent, generations per model call). Flush on `done`. LangChain/LangSmith rejected as orchestration. Prefer manual spans over `observeOpenAI` so Grok Responses API tool calls are captured even if an OpenAI wrapper misses them. The Python academic function stays uninstrumented; the TS wrapper records one HTTP span.

**Considered Options:** LangChain+LangSmith; required Langfuse Cloud; self-hosted Langfuse Docker; console.log only — chose env-gated Langfuse.

**Consequences:** Core Definition of Done unchanged (`next dev` + `XAI_API_KEY` only). Stretch demo needs optional keys. No LangChain dependency in `package.json`.

**Reversal triggers:** Tracing is a judging criterion that must work with zero extra config (then console/OTEL file exporter); or the team wants LangChain graphs instead of `orchestrate()`.
