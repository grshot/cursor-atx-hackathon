import type { Citation, GraphEdge, GraphEvent, GraphNode } from "../lib/types";

export type ScoutGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  citations: Citation[];
};

export function assembleScoutGraph(events: GraphEvent[]): ScoutGraph {
  const nodesById = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];

  for (const event of events) {
    switch (event.type) {
      case "center_pulse":
        nodesById.set("center", {
          id: "center",
          kind: "center",
          status: "pending",
        });
        break;
      case "branch_node_added":
        nodesById.set(event.node.id, event.node);
        edges.push({
          id: `center-${event.node.id}`,
          source: "center",
          target: event.node.id,
        });
        break;
      case "agent_error": {
        const id = event.agentType;
        const existing = nodesById.get(id);
        nodesById.set(id, {
          id,
          kind: "branch",
          status: "error",
          agentType: event.agentType,
          errorMessage: event.message,
          synthesis: existing?.synthesis,
          citations: existing?.citations,
          citationCount: existing?.citationCount,
        });
        if (!edges.some((edge) => edge.target === id)) {
          edges.push({ id: `center-${id}`, source: "center", target: id });
        }
        break;
      }
      case "center_updated": {
        const center = nodesById.get("center") ?? {
          id: "center",
          kind: "center" as const,
          status: "ok" as const,
        };
        nodesById.set("center", {
          ...center,
          status: "ok",
          synthesis: event.synthesis,
        });
        break;
      }
      case "done":
        break;
      default: {
        const _never: never = event;
        throw new Error(`unknown graph event: ${JSON.stringify(_never)}`);
      }
    }
  }

  const nodes = [...nodesById.values()];
  const citations = nodes.flatMap((node) =>
    node.status === "ok" && node.citations ? node.citations : [],
  );
  return { nodes, edges, citations };
}
