import type { AgentType, AgentResult, GraphEvent, GraphNode } from "@/lib/types";
import { generateSubQueries } from "@/lib/orchestration/subquery";
import { synthesize } from "@/lib/orchestration/synthesis";
import { webAgent } from "@/lib/agents/webAgent";
import { xAgent } from "@/lib/agents/xAgent";
import { academicAgent } from "@/lib/agents/academicAgent";
import { queryAgent } from "@/lib/agents/queryAgent";

type AgentOutcome =
  | { agentType: AgentType; status: "ok"; result: AgentResult }
  | { agentType: AgentType; status: "error"; message: string };

// Yields each promise's value as soon as it resolves, in completion order
// (not input order) — this is what makes branch_node_added events stream
// out as agents actually finish, rather than waiting on a fixed sequence.
async function* asCompleted<T>(promises: Promise<T>[]): AsyncGenerator<T> {
  const pending = new Map(promises.map((p, i) => [i, p.then((v) => ({ i, v }))]));
  while (pending.size > 0) {
    const { i, v } = await Promise.race(pending.values());
    pending.delete(i);
    yield v;
  }
}

export async function* orchestrate(query: string): AsyncGenerator<GraphEvent> {
  const queryId = `q-${Date.now()}`;
  yield { type: "center_pulse", queryId, query };

  const subQueries = await generateSubQueries(query);

  const tasks: { agentType: AgentType; run: () => Promise<AgentResult> }[] = [
    { agentType: "web", run: () => webAgent(subQueries) },
    { agentType: "x", run: () => xAgent(subQueries) },
    { agentType: "academic", run: () => academicAgent(subQueries) },
    { agentType: "query1", run: () => queryAgent(subQueries[0]) },
    { agentType: "query2", run: () => queryAgent(subQueries[1]) },
    { agentType: "query3", run: () => queryAgent(subQueries[2]) },
  ];

  const outcomes = tasks.map((task) =>
    task.run().then(
      (result): AgentOutcome => ({ agentType: task.agentType, status: "ok", result }),
      (error): AgentOutcome => ({
        agentType: task.agentType,
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      })
    )
  );

  const results: AgentResult[] = [];
  for await (const outcome of asCompleted(outcomes)) {
    if (outcome.status === "ok") {
      results.push(outcome.result);
      const node: GraphNode = {
        id: outcome.agentType,
        kind: "branch",
        status: "ok",
        agentType: outcome.agentType,
        synthesis: outcome.result.synthesis,
        citations: outcome.result.citations,
        citationCount: outcome.result.citationCount,
      };
      yield { type: "branch_node_added", queryId, node };
    } else {
      yield {
        type: "agent_error",
        queryId,
        agentType: outcome.agentType,
        message: outcome.message,
      };
    }
  }

  const synthesis =
    results.length > 0
      ? await synthesize(query, results)
      : "All agents failed to return results for this query.";

  yield { type: "center_updated", queryId, synthesis };
  yield { type: "done", queryId };
}
