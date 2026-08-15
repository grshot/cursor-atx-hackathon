"use client";

import { useCallback, useRef, useState } from "react";
import type { AgentType, GraphEdge, GraphEvent, GraphNode } from "@/lib/types";

export type SearchStatus = "idle" | "streaming" | "done" | "error";

export type SearchStreamState = {
  query: string | null;
  queryId: string | null;
  status: SearchStatus;
  errorMessage: string | null;
  center: GraphNode | null;
  branches: GraphNode[];
  nodes: GraphNode[];
  edges: GraphEdge[];
};

function graphFrom(
  center: GraphNode | null,
  branches: GraphNode[],
): Pick<SearchStreamState, "center" | "branches" | "nodes" | "edges"> {
  return {
    center,
    branches,
    nodes: center ? [center, ...branches] : branches,
    edges: center
      ? branches.map((branch) => ({
          id: `center-${branch.id}`,
          source: center.id,
          target: branch.id,
        }))
      : [],
  };
}

const INITIAL: SearchStreamState = {
  query: null,
  queryId: null,
  status: "idle",
  errorMessage: null,
  ...graphFrom(null, []),
};

function errorNode(agentType: AgentType, message: string): GraphNode {
  return {
    id: agentType,
    kind: "branch",
    status: "error",
    agentType,
    errorMessage: message,
    citationCount: 0,
    citations: [],
  };
}

function upsertBranch(branches: GraphNode[], node: GraphNode): GraphNode[] {
  const index = branches.findIndex((b) => b.id === node.id);
  if (index === -1) return [...branches, node];
  const next = branches.slice();
  next[index] = node;
  return next;
}

function parseSseBlock(block: string): GraphEvent | null {
  let data: string | undefined;
  for (const line of block.split("\n")) {
    const trimmed = line.replace(/\r$/, "");
    if (trimmed.startsWith("data: ")) data = trimmed.slice(6);
  }
  if (!data) return null;
  // One malformed frame must not throw the whole stream into the error state
  // — skip it and keep consuming; later events still render.
  try {
    return JSON.parse(data) as GraphEvent;
  } catch {
    return null;
  }
}

export function useSearchStream() {
  const [state, setState] = useState<SearchStreamState>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const search = useCallback(async (rawQuery: string) => {
    const query = rawQuery.trim();
    if (!query) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({
      query,
      queryId: null,
      status: "streaming",
      errorMessage: null,
      ...graphFrom(
        {
          id: "center",
          kind: "center",
          status: "pending",
        },
        [],
      ),
    });

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ query }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `Search failed (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const event = parseSseBlock(part);
          if (!event) continue;

          setState((prev) => {
            switch (event.type) {
              case "center_pulse":
                return {
                  ...prev,
                  query: event.query,
                  queryId: event.queryId,
                  status: "streaming",
                  ...graphFrom(
                    {
                      id: "center",
                      kind: "center",
                      status: "pending",
                    },
                    [],
                  ),
                };
              case "branch_node_added":
                return {
                  ...prev,
                  queryId: event.queryId,
                  ...graphFrom(
                    prev.center,
                    upsertBranch(prev.branches, event.node),
                  ),
                };
              case "agent_error":
                return {
                  ...prev,
                  queryId: event.queryId,
                  ...graphFrom(
                    prev.center,
                    upsertBranch(
                      prev.branches,
                      errorNode(event.agentType, event.message),
                    ),
                  ),
                };
              case "center_updated":
                return {
                  ...prev,
                  queryId: event.queryId,
                  ...graphFrom(
                    {
                      id: "center",
                      kind: "center",
                      status: "ok",
                      synthesis: event.synthesis,
                    },
                    prev.branches,
                  ),
                };
              case "done":
                return { ...prev, queryId: event.queryId, status: "done" };
              default:
                return prev;
            }
          });
        }
      }

      setState((prev) =>
        prev.status === "streaming" ? { ...prev, status: "done" } : prev,
      );
    } catch (error) {
      if (controller.signal.aborted) return;
      const message =
        error instanceof Error ? error.message : "Search stream failed";
      setState((prev) => ({
        ...prev,
        status: "error",
        errorMessage: message,
      }));
    }
  }, []);

  return { ...state, search, stop };
}
