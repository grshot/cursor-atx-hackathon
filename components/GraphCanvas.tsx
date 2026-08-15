"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import type { AgentType, GraphNode } from "@/lib/types";
import { BranchNode, branchGroupColor } from "@/components/BranchNode";
import { CenterNode } from "@/components/CenterNode";
import type { SearchStatus } from "@/hooks/useSearchStream";

type Props = {
  query: string | null;
  center: GraphNode | null;
  branches: GraphNode[];
  status: SearchStatus;
};

const SLOT_ANGLES = [-90, -30, 30, 90, 150, 210];
const SLOT_ORDER: AgentType[] = [
  "web",
  "query1",
  "x",
  "query3",
  "academic",
  "query2",
];

type Layout = {
  cx: number;
  cy: number;
  radiusX: number;
  radiusY: number;
};

function computeLayout(graph: HTMLElement, center: HTMLElement | null): Layout {
  const cW = graph.offsetWidth;
  const cH = graph.offsetHeight;

  let maxCardW = 0;
  let maxCardH = 0;
  graph.querySelectorAll<HTMLElement>(".node .card").forEach((card) => {
    if (card.offsetWidth > maxCardW) maxCardW = card.offsetWidth;
    if (card.offsetHeight > maxCardH) maxCardH = card.offsetHeight;
  });

  const cardHalfW = maxCardW / 2 + 14;
  const cardHalfH = maxCardH / 2 + 14;
  const centerHalfW = (center?.offsetWidth ?? 300) / 2 + 10;
  const centerHalfH = (center?.offsetHeight ?? 160) / 2 + 10;
  const cyFrac = 0.46;
  const cx = cW / 2;
  const cy = cH * cyFrac;

  let radiusX = Math.max(60, cW / 2 - cardHalfW);
  const radiusYUp = cy - cardHalfH;
  const radiusYDown = cH - cy - cardHalfH;
  let radiusY = Math.max(60, Math.min(radiusYUp, radiusYDown));
  radiusX = Math.max(radiusX, centerHalfW + cardHalfW * 0.7);
  radiusY = Math.max(radiusY, centerHalfH + cardHalfH * 0.7);

  return { cx, cy, radiusX, radiusY };
}

function slotIndex(agentType: AgentType | undefined, fallback: number): number {
  if (!agentType) return fallback;
  const index = SLOT_ORDER.indexOf(agentType);
  return index === -1 ? fallback : index;
}

function centerPoint(rect: DOMRect, gRect: DOMRect) {
  return {
    x: rect.left - gRect.left + rect.width / 2,
    y: rect.top - gRect.top + rect.height / 2,
  };
}

function quadraticPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  bendSign: number,
): string {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = -dy / dist;
  const ny = dx / dist;
  const bend = dist * 0.13 * bendSign;
  const cx = mx + nx * bend;
  const cy = my + ny * bend;
  return `M${from.x.toFixed(1)},${from.y.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${to.x.toFixed(1)},${to.y.toFixed(1)}`;
}

export function GraphCanvas({ query, center, branches, status }: Props) {
  const graphRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const drawnRef = useRef<Set<string>>(new Set());

  const applyPositions = useCallback(() => {
    const graph = graphRef.current;
    if (!graph) return;
    const centerEl = graph.querySelector<HTMLElement>("#center");
    const layout = computeLayout(graph, centerEl);
    if (centerEl) {
      centerEl.style.left = `${layout.cx}px`;
      centerEl.style.top = `${layout.cy}px`;
    }
    branches.forEach((node, i) => {
      const el = graph.querySelector<HTMLElement>(`#node-${node.id}`);
      if (!el) return;
      const rad =
        (SLOT_ANGLES[slotIndex(node.agentType, i)] * Math.PI) / 180;
      el.style.left = `${layout.cx + Math.cos(rad) * layout.radiusX}px`;
      el.style.top = `${layout.cy + Math.sin(rad) * layout.radiusY}px`;
    });
  }, [branches]);

  const updateLines = useCallback(() => {
    const graph = graphRef.current;
    if (!graph) return;
    const centerEl = graph.querySelector<HTMLElement>("#center");
    if (!centerEl) return;
    const gRect = graph.getBoundingClientRect();
    const c = centerPoint(centerEl.getBoundingClientRect(), gRect);
    branches.forEach((node, i) => {
      const el = graph.querySelector<HTMLElement>(`#node-${node.id}`);
      const path = graph.querySelector<SVGPathElement>(`#line-${node.id}`);
      if (!el || !path) return;
      const p = centerPoint(el.getBoundingClientRect(), gRect);
      path.setAttribute(
        "d",
        quadraticPath(c, p, i % 2 === 0 ? 1 : -1),
      );
    });
  }, [branches]);

  const animateLinesFor = useCallback(
    (ms: number) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const start = performance.now();
      const step = (t: number) => {
        updateLines();
        if (t - start < ms) rafRef.current = requestAnimationFrame(step);
        else rafRef.current = null;
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [updateLines],
  );

  useLayoutEffect(() => {
    applyPositions();
    updateLines();
  }, [center, applyPositions, updateLines]);

  useEffect(() => {
    if (branches.length === 0) drawnRef.current.clear();
  }, [branches.length, query]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;

    branches.forEach((node) => {
      if (drawnRef.current.has(node.id)) return;
      const path = graph.querySelector<SVGPathElement>(`#line-${node.id}`);
      if (!path || !path.getAttribute("d")) return;
      drawnRef.current.add(node.id);
      const len = path.getTotalLength();
      path.style.strokeDasharray = `${len}`;
      path.style.strokeDashoffset = `${len}`;
      path.style.transition = "none";
      requestAnimationFrame(() => {
        path.style.transition =
          "stroke-dashoffset .8s cubic-bezier(.3,.6,.2,1), stroke .5s ease";
        path.style.strokeDashoffset = "0";
      });
    });

    animateLinesFor(900);
  }, [branches, center, animateLinesFor]);

  useEffect(() => {
    const onResize = () => {
      applyPositions();
      updateLines();
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [center, branches, applyPositions, updateLines]);

  const resolvedCount = branches.filter((b) => b.status !== "pending").length;

  return (
    <div className="canvas-wrap" data-status={status}>
      <div id="graph" ref={graphRef}>
        <svg id="lines" aria-hidden>
          {branches.map((node) => (
            <path
              key={node.id}
              id={`line-${node.id}`}
              className="branch-line"
              style={{ stroke: branchGroupColor(node.agentType) }}
            />
          ))}
        </svg>
        <CenterNode
          query={query}
          node={center}
          branchCount={branches.length}
          resolvedCount={resolvedCount}
        />
        {branches.map((node) => (
          <BranchNode key={node.id} node={node} />
        ))}
        {!center ? (
          <p className="empty-hint">submit a query to grow the graph</p>
        ) : null}
      </div>
    </div>
  );
}
