"use client";

import { useEffect, useState } from "react";
import type { GraphNode } from "@/lib/types";
import type { WorldPoint } from "@/lib/constellation";
import { cleanErrorMessage, stripMarkdown } from "@/lib/format";

type Props = {
  query: string;
  node: GraphNode;
  pos: WorldPoint;
  resolvedCount: number;
  errorMessage: string | null;
  onSelect: () => void;
};

export function CenterNode({
  query,
  node,
  pos,
  resolvedCount,
  errorMessage,
  onSelect,
}: Props) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const pulsing = node.status === "pending" && !errorMessage;
  const settled = node.status === "ok";
  const className = [
    "center-node",
    entered ? "in" : "",
    pulsing ? "thinking" : "",
    settled ? "settled" : "",
    errorMessage ? "failed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={className}
      style={{ left: pos.x, top: pos.y }}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") onSelect();
      }}
    >
      <p className="center-kicker">synthesized answer</p>
      <p className="center-query">“{query}”</p>
      <div className="center-answer">
        <p className="thinking-text">
          scouts are out<span className="thinking-dots" />
        </p>
        <p className="final-text">
          {errorMessage
            ? `The search stream failed: ${cleanErrorMessage(errorMessage)}`
            : stripMarkdown(node.synthesis ?? "")}
        </p>
      </div>
      <p className="center-meta">
        {settled
          ? `${resolvedCount} scouts reported back`
          : errorMessage
            ? "stream lost"
            : "waiting on branch agents"}
      </p>
    </div>
  );
}
