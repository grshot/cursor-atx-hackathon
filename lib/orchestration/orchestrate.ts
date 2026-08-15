import type { AgentType, GraphEvent, GraphNode } from "@/lib/types";

// STUB for Phase 1 — unblocks Phase 5 (MCP server) and Phase 6 (SSE route)
// against a realistic fake event stream. Replaced with the real
// sub-query generation -> 6-agent fan-out -> synthesis pipeline in Phase 2/3.

const FAKE_AGENTS: { agentType: AgentType; synthesis: string; citationCount: number }[] = [
  { agentType: "web", synthesis: "Fake web synthesis spanning all 3 sub-query angles.", citationCount: 3 },
  { agentType: "x", synthesis: "Fake X synthesis spanning all 3 sub-query angles.", citationCount: 3 },
  { agentType: "academic", synthesis: "Fake academic synthesis spanning all 3 sub-query angles.", citationCount: 3 },
  { agentType: "query1", synthesis: "Fake single-angle web synthesis for sub-query 1.", citationCount: 2 },
  { agentType: "query2", synthesis: "Fake single-angle web synthesis for sub-query 2.", citationCount: 2 },
  { agentType: "query3", synthesis: "Fake single-angle web synthesis for sub-query 3.", citationCount: 2 },
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function* orchestrate(query: string): AsyncGenerator<GraphEvent> {
  const queryId = `fake-${Date.now()}`;

  yield { type: "center_pulse", queryId, query };

  for (const agent of FAKE_AGENTS) {
    await sleep(400);
    const node: GraphNode = {
      id: agent.agentType,
      kind: "branch",
      status: "ok",
      agentType: agent.agentType,
      synthesis: agent.synthesis,
      citationCount: agent.citationCount,
      citations: [],
    };
    yield { type: "branch_node_added", queryId, node };
  }

  await sleep(400);
  yield {
    type: "center_updated",
    queryId,
    synthesis: `Fake synthesized answer for "${query}", combining all 6 branch agents.`,
  };

  yield { type: "done", queryId };
}
