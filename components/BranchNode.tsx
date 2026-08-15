"use client";

import { useEffect, useState } from "react";
import type { AgentType, GraphNode } from "@/lib/types";

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
  web: { tag: "Web Agent", icon: "globe", sub: "spans all 3 angles", group: 0 },
  x: { tag: "X Agent", icon: "spark", sub: "spans all 3 angles", group: 1 },
  academic: { tag: "Academic Agent", icon: "book", sub: "spans all 3 angles", group: 2 },
  query1: { tag: "Angle 1", icon: "compass", sub: "web-sourced · single angle", group: 0 },
  query2: { tag: "Angle 2", icon: "compass", sub: "web-sourced · single angle", group: 2 },
  query3: { tag: "Angle 3", icon: "compass", sub: "web-sourced · single angle", group: 1 },
};

const GROUP_COLORS = [
  "var(--group-a)",
  "var(--group-b)",
  "var(--group-c)",
] as const;

type Props = {
  node: GraphNode;
};

export function branchGroupColor(agentType: AgentType | undefined): string {
  if (!agentType) return GROUP_COLORS[0];
  return GROUP_COLORS[AGENT_META[agentType].group];
}

export function BranchNode({ node }: Props) {
  const [entered, setEntered] = useState(false);
  const meta = node.agentType ? AGENT_META[node.agentType] : AGENT_META.web;
  const isError = node.status === "error";

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const className = ["node", entered ? "in" : "", isError ? "error" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={className}
      id={`node-${node.id}`}
      data-kind="branch"
      data-agent={node.agentType}
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
          <span className="node-tag">{meta.tag}</span>
        </div>
        <p className="node-sub">{isError ? "agent failed" : meta.sub}</p>
        <p className="node-text">
          {isError
            ? node.errorMessage || "This agent did not return a result."
            : node.synthesis}
        </p>
        <div className="node-foot">
          <span className="cite-count">
            {isError ? "0 sources" : `${node.citationCount ?? 0} sources`}
          </span>
        </div>
      </div>
    </div>
  );
}
