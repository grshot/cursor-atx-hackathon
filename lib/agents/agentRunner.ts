import type { AgentResult } from "@/lib/types";

// TODO(Phase 2): shared helper that fires a Grok Responses API tool call
// (web_search or x_search), parses citations out of output[].content[].annotations
// (url_citation objects: { url, title, start_index, end_index } — title is just
// a numeric label, not a real page title, per Phase 0 findings), and produces
// AgentResult. Reused as-is by the 3 query-agents in Phase 3.
export async function agentRunner(
  tool: "web_search" | "x_search",
  subQueries: string[]
): Promise<AgentResult> {
  throw new Error("agentRunner not implemented yet — see Phase 2");
}
