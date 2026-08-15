# Grok-only retrieval; capability-flagged reasoning adapter

`web_search` and `x_search` are Grok server-side tools. A generic OpenAI-compatible swap cannot perform X/web retrieval. Spec requires Grok 4.6 as the engine, not a bolted-on option.

**Status:** accepted

**Decision:** Split `RetrievalProvider` (Grok, not swapped in core) from `ReasoningProvider` (`complete()` for sub-queries + synthesis, default `grok-4.6`). Cursor’s model picker may still change the *host* agent that calls MCP. No core-demo model dropdown. Capabilities flags (`webSearch`, `xSearch`, `synthesize`) make a later adapter honest: if a provider cannot search, those branch agents stay on Grok or emit `agent_error`.

**Considered Options:** Hardcode Grok everywhere; OpenRouter; full-stack model switcher — chose split adapter.

**Consequences:** `lib/llm/types.ts` is the seam. Retrieval calls stay on xAI Responses API tools. Reasoning may later take `?model=` / MCP `model` without touching extractors or layouts.

**Reversal triggers:** Live “swap synthesizer” demo required (`?model=` / MCP `model` arg); or xAI tools appear on other providers.
