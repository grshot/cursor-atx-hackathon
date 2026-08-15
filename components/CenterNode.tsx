"use client";

import { useEffect, useState } from "react";
import type { GraphNode } from "@/lib/types";

type Props = {
  query: string | null;
  node: GraphNode | null;
  branchCount: number;
  resolvedCount: number;
};

export function CenterNode({ query, node, branchCount, resolvedCount }: Props) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [node?.id, query]);

  if (!node) return null;

  const pulsing = node.status === "pending";
  const settled = node.status === "ok";
  const className = [
    "center-node",
    entered ? "in" : "",
    pulsing ? "thinking" : "",
    settled ? "settled" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className} id="center" data-kind="center">
      <p className="center-kicker">synthesized answer</p>
      {query ? <p className="center-query">“{query}”</p> : null}
      <div className="center-answer">
        <p className="thinking-text">
          reading 6 agents<span className="thinking-dots" />
        </p>
        <p className="final-text">{node.synthesis}</p>
      </div>
      <p className="center-meta">
        {settled
          ? `${resolvedCount} / ${Math.max(branchCount, 6)} agents resolved`
          : "waiting on branch agents"}
      </p>
    </div>
  );
}
