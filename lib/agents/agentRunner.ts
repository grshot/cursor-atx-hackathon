import type { AgentResult, Citation } from "@/lib/types";
import { xai, extractMessage, FAST_MODEL } from "@/lib/llm/xai";

// Shared retrieval-agent helper: fires one Grok Responses API tool call
// (web_search or x_search) covering all of subQueries in a single request,
// and shapes the result into AgentResult. Reused as-is by the 3 query-agents
// in Phase 3 (single-element subQueries array).
export async function agentRunner(
  tool: "web_search" | "x_search",
  subQueries: string[],
  signal?: AbortSignal
): Promise<AgentResult> {
  const prompt = buildPrompt(subQueries);
  const response = await xai.callResponses(prompt, [{ type: tool }], signal, FAST_MODEL);
  const { text, annotations } = extractMessage(response);

  const source = tool === "web_search" ? "web" : "x";
  const citations = dedupeCitations(
    annotations.map((a) => ({ url: a.url, title: deriveTitle(a.url), source }) as Citation)
  );

  return {
    synthesis: text,
    citations,
    citationCount: citations.length,
  };
}

function buildPrompt(subQueries: string[]): string {
  if (subQueries.length === 1) {
    return `Research this query and provide a synthesized answer with citations: ${subQueries[0]}`;
  }
  const numbered = subQueries.map((q, i) => `${i + 1}) ${q}`).join("\n");
  return `Research these sub-questions and provide ONE synthesized answer that covers all of them, with citations:\n${numbered}`;
}

// Grok's web_search/x_search annotations only give a bare URL and a numeric
// citation label, not a real page title (confirmed in Phase 0) — derive a
// readable fallback from the hostname.
function deriveTitle(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function dedupeCitations(citations: Citation[]): Citation[] {
  const seen = new Set<string>();
  return citations.filter((c) => {
    if (seen.has(c.url)) return false;
    seen.add(c.url);
    return true;
  });
}
