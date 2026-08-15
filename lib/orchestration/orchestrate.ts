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

// Every code path out of this generator ends with center_updated -> done:
// the SSE route has already sent a 200 + headers by the time anything here
// runs, so an escaped throw can only surface as a dropped connection the
// client can't distinguish from a network failure. Failures are folded into
// the event stream instead. `signal` (client disconnect) aborts all in-flight
// upstream calls so an abandoned query stops burning Grok spend.
export async function* orchestrate(
  query: string,
  options?: { signal?: AbortSignal }
): AsyncGenerator<GraphEvent> {
  const signal = options?.signal;
  const queryId = `q-${Date.now()}`;
  yield { type: "center_pulse", queryId, query };

  let subQueries: [string, string, string];
  try {
    subQueries = await generateSubQueries(query, signal);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    yield {
      type: "center_updated",
      queryId,
      synthesis: `Search failed before any agents could start: ${message}`,
    };
    yield { type: "done", queryId };
    return;
  }

  const tasks: { agentType: AgentType; run: () => Promise<AgentResult> }[] = [
    { agentType: "web", run: () => webAgent(subQueries, signal) },
    { agentType: "x", run: () => xAgent(subQueries, signal) },
    { agentType: "academic", run: () => academicAgent(subQueries, signal) },
    { agentType: "query1", run: () => queryAgent(subQueries[0], signal) },
    { agentType: "query2", run: () => queryAgent(subQueries[1], signal) },
    { agentType: "query3", run: () => queryAgent(subQueries[2], signal) },
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

  // Client is gone — every remaining event would be dropped, so don't spend
  // another ~29s/1 Grok call on a synthesis nobody will see.
  if (signal?.aborted) return;

  let synthesis: string;
  if (results.length === 0) {
    synthesis = "All agents failed to return results for this query.";
  } else {
    try {
      synthesis = await synthesize(query, results, signal);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      synthesis = `Final synthesis failed (${message}) — the ${results.length} branch nodes above each carry their own synthesized findings and citations.`;
    }
  }

  yield { type: "center_updated", queryId, synthesis };
  yield { type: "done", queryId };
}
