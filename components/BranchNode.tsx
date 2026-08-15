"use client";

import { useEffect, useState } from "react";
import type { AgentType, GraphNode } from "@/lib/types";
import type { WorldPoint } from "@/lib/constellation";
import { cleanErrorMessage, shortLabel, stripMarkdown } from "@/lib/format";

const ICONS: Record<string, string> = {
  globe:
    '<circle cx="10" cy="10" r="7.4"/><path d="M2.6 10h14.8M10 2.6c2.6 2.2 4 4.7 4 7.4s-1.4 5.2-4 7.4c-2.6-2.2-4-4.7-4-7.4s1.4-5.2 4-7.4z"/>',
  spark:
    '<path d="M10 2.4 12 8.2 17.6 10 12 11.8 10 17.6 8 11.8 2.4 10 8 8.2z"/>',
  book: '<path d="M3 4.6c2.1-1 4.4-1 6.6 0v11.8c-2.2-1-4.5-1-6.6 0z"/><path d="M17 4.6c-2.1-1-4.4-1-6.6 0v11.8c2.2-1 4.5-1 6.6 0z"/>',
  compass:
    '<circle cx="10" cy="10" r="7.4"/><path d="M12.6 7.4 11 11l-3.6 1.6L9 9z"/>',
};

type Meta = { tag: string; icon: keyof typeof ICONS; sub: string; group: 0 | 1 | 2 };

const AGENT_META: Record<AgentType, Meta> = {
  web: { tag: "Web Scout", icon: "globe", sub: "spans all angles", group: 0 },
  x: { tag: "X Scout", icon: "spark", sub: "spans all angles", group: 1 },
  academic: { tag: "Academic Scout", icon: "book", sub: "spans all angles", group: 2 },
  query1: { tag: "Angle 1", icon: "compass", sub: "web-sourced · angle 1", group: 0 },
  query2: { tag: "Angle 2", icon: "compass", sub: "web-sourced · angle 2", group: 2 },
  query3: { tag: "Angle 3", icon: "compass", sub: "web-sourced · angle 3", group: 1 },
};

const GROUP_COLORS = [
  "var(--group-a)",
  "var(--group-b)",
  "var(--group-c)",
] as const;

export function branchGroupColor(agentType: AgentType | undefined): string {
  if (!agentType) return GROUP_COLORS[0];
  return GROUP_COLORS[AGENT_META[agentType].group];
}

// The angle agents are named by their actual sub-query when it's known;
// "Angle N" is only the placeholder before subqueries_ready arrives.
export function branchLabel(node: Pick<GraphNode, "agentType" | "subQuery">): string {
  if (node.subQuery) return shortLabel(node.subQuery, 34);
  return node.agentType ? AGENT_META[node.agentType].tag : "Scout";
}

type Props = {
  node: GraphNode;
  pos: WorldPoint;
  onSelect: (nodeId: string) => void;
};

export function BranchNode({ node, pos, onSelect }: Props) {
  const [entered, setEntered] = useState(false);
  const meta = node.agentType ? AGENT_META[node.agentType] : AGENT_META.web;
  const isError = node.status === "error";
  const isPending = node.status === "pending";

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const className = [
    "node",
    entered ? "in" : "",
    isError ? "error" : "",
    isPending ? "pending" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={className}
      style={{ left: pos.x, top: pos.y }}
      data-kind="branch"
      data-agent={node.agentType}
      role={isPending ? undefined : "button"}
      tabIndex={isPending ? undefined : 0}
      onClick={isPending ? undefined : () => onSelect(node.id)}
      onKeyDown={
        isPending
          ? undefined
          : (e) => {
              if (e.key === "Enter") onSelect(node.id);
            }
      }
    >
      <div className="card">
        <div className="node-head">
          <span
            className="node-dot"
            style={{ background: branchGroupColor(node.agentType) }}
          />
          <svg
            className="node-icon"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            dangerouslySetInnerHTML={{ __html: ICONS[meta.icon] }}
          />
          <span className="node-tag">{branchLabel(node)}</span>
        </div>
        <p className="node-sub">
          {isPending ? "scouting" : isError ? "agent failed" : meta.sub}
          {isPending ? <span className="thinking-dots" /> : null}
        </p>
        {isPending ? (
          <div className="node-skeleton" aria-hidden>
            <span />
            <span />
            <span />
          </div>
        ) : (
          <p className="node-text">
            {isError
              ? cleanErrorMessage(node.errorMessage || "This agent did not return a result.")
              : stripMarkdown(node.synthesis ?? "")}
          </p>
        )}
        <div className="node-foot">
          <span className="cite-count">
            {isPending
              ? "searching sources"
              : isError
                ? "0 sources"
                : `${node.citationCount ?? 0} sources`}
          </span>
          {!isPending && !isError ? <span className="node-open">expand ›</span> : null}
        </div>
      </div>
    </div>
  );
}
