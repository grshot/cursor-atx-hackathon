"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentType, GraphEvent, GraphNode } from "@/lib/types";
import {
  placeSearch,
  SLOT_ORDERS,
  type TrailAnchor,
  type WorldPoint,
} from "@/lib/constellation";

export type SearchStatus = "streaming" | "done" | "error";

export type SearchRecord = {
  id: string; // client-side id; node ids are namespaced with it
  query: string;
  status: SearchStatus;
  errorMessage: string | null;
  center: GraphNode;
  branches: GraphNode[];
  origin: WorldPoint;
  linkFrom: TrailAnchor | null;
  subQueries: [string, string, string] | null;
};

const ANGLE_AGENTS = ["query1", "query2", "query3"] as const;

function pendingCenter(searchId: string): GraphNode {
  return { id: `${searchId}:center`, kind: "center", status: "pending" };
}

// The fan-out is visible the instant a search starts: every agent gets a
// pending ghost card immediately, upserted into a real result (or error)
// as its stream event lands.
function pendingBranches(searchId: string): GraphNode[] {
  return SLOT_ORDERS.source.map((agentType) => ({
    id: `${searchId}:${agentType}`,
    kind: "branch" as const,
    status: "pending" as const,
    agentType,
    citations: [],
    citationCount: 0,
  }));
}

// Server node ids are bare agent types; namespace them per search so several
// graphs can coexist on one canvas.
function remapNode(searchId: string, node: GraphNode): GraphNode {
  return { ...node, id: `${searchId}:${node.id}` };
}

function errorNode(searchId: string, agentType: AgentType, message: string): GraphNode {
  return {
    id: `${searchId}:${agentType}`,
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

function applyEvent(record: SearchRecord, event: GraphEvent): SearchRecord {
  switch (event.type) {
    case "center_pulse":
      return record;
    case "subqueries_ready":
      // Label the pending ghost cards with their angle text right away.
      return {
        ...record,
        subQueries: event.subQueries,
        branches: record.branches.map((branch) => {
          const angleIndex = branch.agentType
            ? ANGLE_AGENTS.indexOf(branch.agentType as (typeof ANGLE_AGENTS)[number])
            : -1;
          return angleIndex === -1
            ? branch
            : { ...branch, subQuery: event.subQueries[angleIndex] };
        }),
      };
    case "branch_node_added":
      return {
        ...record,
        branches: upsertBranch(record.branches, remapNode(record.id, event.node)),
      };
    case "agent_error":
      return {
        ...record,
        branches: upsertBranch(
          record.branches,
          errorNode(record.id, event.agentType, event.message),
        ),
      };
    case "center_preview":
      // Preliminary no-tools answer: fills the center fast but keeps status
      // "pending" so the UI labels it a quick take until the real synthesis.
      return {
        ...record,
        center:
          record.center.status === "ok"
            ? record.center
            : { ...record.center, synthesis: event.synthesis },
      };
    case "center_updated":
      return {
        ...record,
        center: { ...record.center, status: "ok", synthesis: event.synthesis },
      };
    case "done":
      return { ...record, status: "done" };
    default:
      return record;
  }
}

function parseSseBlock(block: string): GraphEvent | null {
  let data: string | undefined;
  for (const line of block.split("\n")) {
    const trimmed = line.replace(/\r$/, "");
    if (trimmed.startsWith("data: ")) data = trimmed.slice(6);
  }
  if (!data) return null;
  // One malformed frame must not kill the stream — skip it, keep consuming.
  try {
    return JSON.parse(data) as GraphEvent;
  } catch {
    return null;
  }
}

// Design-iteration mode: a query prefixed with "!" fabricates a staggered
// event stream client-side instead of spending a real 6-agent Grok run.
// Branch texts carry distinct angle keywords so the directional follow-up
// matching is exercisable offline too.
const MOCK_TEXT: Record<AgentType, (q: string) => string> = {
  web: (q) =>
    `Across the wider web, coverage of ${q} keeps returning to its origins — the early history, founding figures, and first turning points that set the trajectory.`,
  x: (q) =>
    `On X the live conversation about ${q} is split down the middle: current debate, sharp takes posted today, and practitioners arguing about what is working right now.`,
  academic: (q) =>
    `Peer-reviewed work on ${q} focuses on methods and measured evidence — benchmarks, replication attempts, and the limits of what published studies actually demonstrate.`,
  query1: (q) =>
    `The origins angle in depth: where ${q} came from, who started it, and why those early design choices still constrain everything downstream.`,
  query2: (q) =>
    `The current-state angle: how ${q} operates today, who has adopted it, and the tradeoffs teams weigh in production right now.`,
  query3: (q) =>
    `The outlook angle: credible forecasts for ${q}, milestones expected next, and what would have to happen for the next big leap.`,
};

const MOCK_ORDER: AgentType[] = ["web", "query1", "x", "academic", "query3", "query2"];

export function useScoutSession() {
  const [searches, setSearches] = useState<SearchRecord[]>([]);
  const searchesRef = useRef<SearchRecord[]>([]);
  const counterRef = useRef(0);
  const controllersRef = useRef(new Map<string, AbortController>());

  const commit = useCallback(
    (updater: (prev: SearchRecord[]) => SearchRecord[]) => {
      setSearches((prev) => {
        const next = updater(prev);
        searchesRef.current = next;
        return next;
      });
    },
    [],
  );

  const updateRecord = useCallback(
    (id: string, fn: (record: SearchRecord) => SearchRecord) => {
      commit((prev) => prev.map((r) => (r.id === id ? fn(r) : r)));
    },
    [commit],
  );

  useEffect(() => {
    const controllers = controllersRef.current;
    return () => {
      controllers.forEach((c) => c.abort());
      controllers.clear();
    };
  }, []);

  const runMock = useCallback(
    (id: string, query: string, signal: AbortSignal) => {
      const emit = (delay: number, event: GraphEvent) => {
        setTimeout(() => {
          if (signal.aborted) return;
          updateRecord(id, (record) => applyEvent(record, event));
        }, delay);
      };
      emit(900, {
        type: "center_preview",
        queryId: id,
        synthesis: `Quick take on “${query}”: from what's already known, the short answer is nuanced — real progress exists but the headline claims outrun it. The scouts are out verifying this against live web, X, and academic sources right now.`,
      });
      emit(350, {
        type: "subqueries_ready",
        queryId: id,
        subQueries: [
          `origins and early history of ${query}`,
          `current state and debate around ${query}`,
          `future outlook for ${query}`,
        ],
      });
      MOCK_ORDER.forEach((agentType, i) => {
        emit(500 + i * 450 + (i % 3) * 130, {
          type: "branch_node_added",
          queryId: id,
          node: {
            id: agentType,
            kind: "branch",
            status: "ok",
            agentType,
            synthesis: MOCK_TEXT[agentType](query),
            citationCount: 3 + ((i * 5) % 7),
            citations: [],
          },
        });
      });
      emit(3600, {
        type: "center_updated",
        queryId: id,
        synthesis: `Mock synthesis for “${query}”: the scouts agree the story splits into origins, a contested present, and a plausible outlook — drill into any branch to go deeper.`,
      });
      emit(3800, { type: "done", queryId: id });
    },
    [updateRecord],
  );

  const search = useCallback(
    async (rawQuery: string) => {
      const trimmed = rawQuery.trim();
      if (!trimmed) return;
      const mock = trimmed.startsWith("!");
      const query = mock ? trimmed.slice(1).trim() : trimmed;
      if (!query) return;

      counterRef.current += 1;
      const id = `s${counterRef.current}`;
      const existing = searchesRef.current;
      const prev = existing.length > 0 ? existing[existing.length - 1] : null;
      const placement = placeSearch(
        query,
        prev ? { id: prev.id, origin: prev.origin, branches: prev.branches } : null,
        existing.length,
        existing.map((r) => r.origin),
      );

      const record: SearchRecord = {
        id,
        query,
        status: "streaming",
        errorMessage: null,
        center: pendingCenter(id),
        branches: pendingBranches(id),
        subQueries: null,
        ...placement,
      };
      commit((prevState) => [...prevState, record]);

      const controller = new AbortController();
      controllersRef.current.set(id, controller);

      if (mock) {
        runMock(id, query, controller.signal);
        return;
      }

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
            updateRecord(id, (r) => applyEvent(r, event));
          }
        }

        updateRecord(id, (r) =>
          r.status === "streaming" ? { ...r, status: "done" } : r,
        );
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : "Search stream failed";
        updateRecord(id, (r) => ({ ...r, status: "error", errorMessage: message }));
      } finally {
        controllersRef.current.delete(id);
      }
    },
    [commit, runMock, updateRecord],
  );

  // Back to the landing hero: abort every in-flight stream (stops Grok
  // spend server-side) and clear the map.
  const reset = useCallback(() => {
    controllersRef.current.forEach((controller) => controller.abort());
    controllersRef.current.clear();
    commit(() => []);
  }, [commit]);

  return { searches, search, reset };
}
