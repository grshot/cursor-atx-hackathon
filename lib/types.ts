export type AgentType = "web" | "x" | "academic" | "query1" | "query2" | "query3";

export type Citation = {
  url: string;
  // Real title from a source API (Semantic Scholar) when available, else
  // derived from the URL hostname — Grok's web_search/x_search only return
  // bare URLs, no titles or snippets (confirmed in Phase 0).
  title: string;
  source: "web" | "x" | "academic";
};

export type AgentResult = {
  synthesis: string;
  citations: Citation[];
  citationCount: number;
};

export type GraphNode = {
  id: string;
  kind: "center" | "branch";
  status: "pending" | "ok" | "error";
  agentType?: AgentType; // branch nodes only
  subQuery?: string; // the sub-query angle this node covers (query agents)
  synthesis?: string;
  citations?: Citation[];
  citationCount?: number;
  errorMessage?: string; // set when status is "error"
};

// Prior searches from the same session, sent by the client so follow-up
// searches build on (rather than repeat) what's already been explored.
export type SessionContext = { query: string; synthesis: string }[];

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
};

export type GraphEvent =
  | { type: "center_pulse"; queryId: string; query: string }
  | { type: "subqueries_ready"; queryId: string; subQueries: [string, string, string] }
  | { type: "center_preview"; queryId: string; synthesis: string }
  | { type: "branch_node_added"; queryId: string; node: GraphNode }
  | { type: "agent_error"; queryId: string; agentType: AgentType; message: string }
  | { type: "center_updated"; queryId: string; synthesis: string }
  | { type: "done"; queryId: string };
