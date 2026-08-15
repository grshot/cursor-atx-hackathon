"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  branchPositions,
  computeCrossLinks,
  edgePath,
  groupHalos,
  type GraphLayout,
  type TrailAnchor,
  type WorldPoint,
} from "@/lib/constellation";
import type { SearchRecord } from "@/hooks/useScoutSession";
import { BranchNode, branchGroupColor } from "@/components/BranchNode";
import { angleLabel } from "@/lib/format";
import { CenterNode } from "@/components/CenterNode";
import { DetailPanel } from "@/components/DetailPanel";

type Props = {
  searches: SearchRecord[];
  layout: GraphLayout;
};

const MIN_SCALE = 0.28;
const MAX_SCALE = 1.7;

type Selection = { searchId: string; nodeId: string } | null;

// Camera lives in refs and writes transforms directly — panning at 60fps
// through setState would re-render every card per frame for no reason.
export function Constellation({ searches, layout }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const camRef = useRef({ x: 0, y: 0, s: 0.82 });
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    camX: number;
    camY: number;
  } | null>(null);
  const [selected, setSelected] = useState<Selection>(null);

  const applyCamera = useCallback((animate: boolean) => {
    const wrap = wrapRef.current;
    const world = worldRef.current;
    if (!wrap || !world) return;
    const { x, y, s } = camRef.current;
    world.style.transition = animate
      ? "transform 1s cubic-bezier(0.22, 1, 0.36, 1)"
      : "none";
    world.style.transform = `translate(${wrap.offsetWidth / 2 - x * s}px, ${
      wrap.offsetHeight / 2 - y * s
    }px) scale(${s})`;
  }, []);

  const flyTo = useCallback(
    (point: WorldPoint) => {
      camRef.current = { ...camRef.current, x: point.x, y: point.y };
      applyCamera(true);
    },
    [applyCamera],
  );

  // Fly to each new cluster as it is born.
  const latestId = searches.length > 0 ? searches[searches.length - 1].id : null;
  useLayoutEffect(() => {
    if (!latestId) return;
    const latest = searches[searches.length - 1];
    flyTo(latest.origin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestId, flyTo]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const onWheel = (e: WheelEvent) => {
      // The detail panel scrolls its own content — don't hijack its wheel.
      if ((e.target as HTMLElement).closest(".detail-panel")) return;
      e.preventDefault();
      const rect = wrap.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const { x, y, s } = camRef.current;
      const ns = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, s * Math.exp(-e.deltaY * 0.0016)),
      );
      // Keep the world point under the cursor fixed while scaling.
      const wx = x + (mx - rect.width / 2) / s;
      const wy = y + (my - rect.height / 2) / s;
      camRef.current = {
        x: wx - (mx - rect.width / 2) / ns,
        y: wy - (my - rect.height / 2) / ns,
        s: ns,
      };
      applyCamera(false);
    };

    const onResize = () => applyCamera(false);

    wrap.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", onResize);
    return () => {
      wrap.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
    };
  }, [applyCamera]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    // Let card and panel interactions win over panning.
    if ((e.target as HTMLElement).closest(".node, .center-node, .detail-panel")) return;
    wrapRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      camX: camRef.current.x,
      camY: camRef.current.y,
    };
    wrapRef.current?.classList.add("panning");
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;
      const { s } = camRef.current;
      camRef.current = {
        ...camRef.current,
        x: drag.camX - (e.clientX - drag.startX) / s,
        y: drag.camY - (e.clientY - drag.startY) / s,
      };
      applyCamera(false);
    },
    [applyCamera],
  );

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (dragRef.current?.pointerId === e.pointerId) {
      dragRef.current = null;
      wrapRef.current?.classList.remove("panning");
    }
  }, []);

  const recordsById = useMemo(
    () => new Map(searches.map((r) => [r.id, r])),
    [searches],
  );

  const positionsById = useMemo(
    () =>
      new Map(
        searches.map((r) => [r.id, branchPositions(r.origin, r.branches, layout)]),
      ),
    [searches, layout],
  );

  const crossLinks = useMemo(() => computeCrossLinks(searches), [searches]);

  const halosById = useMemo(
    () =>
      new Map(
        searches.map((record) => [
          record.id,
          groupHalos(
            record.origin,
            record.branches,
            positionsById.get(record.id) ?? [],
            layout,
            record.subQueries
              ? (record.subQueries.map((q) => angleLabel(q, record.query)) as [
                  string,
                  string,
                  string,
                ])
              : null,
          ),
        ]),
      ),
    [searches, positionsById, layout],
  );

  const nodePoint = useCallback(
    (searchId: string, nodeId: string): WorldPoint | null => {
      const record = recordsById.get(searchId);
      const positions = positionsById.get(searchId);
      if (!record || !positions) return null;
      const index = record.branches.findIndex((b) => b.id === nodeId);
      return index === -1 ? null : positions[index];
    },
    [recordsById, positionsById],
  );

  const anchorPoint = useCallback(
    (link: TrailAnchor): WorldPoint | null => {
      const parent = recordsById.get(link.parentId);
      if (!parent) return null;
      if (!link.agentType) return parent.origin;
      const index = parent.branches.findIndex((b) => b.agentType === link.agentType);
      if (index === -1) return parent.origin;
      return positionsById.get(link.parentId)?.[index] ?? parent.origin;
    },
    [recordsById, positionsById],
  );

  const selectedNode = useMemo(() => {
    if (!selected) return null;
    const record = recordsById.get(selected.searchId);
    if (!record) return null;
    const node =
      record.center.id === selected.nodeId
        ? record.center
        : record.branches.find((b) => b.id === selected.nodeId);
    return node ? { record, node } : null;
  }, [selected, recordsById]);

  return (
    <div
      className="constellation"
      ref={wrapRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="world" ref={worldRef}>
        <svg className="world-lines" aria-hidden>
          {searches.map((record) => (
            <g key={`halo-${record.id}`}>
              {(halosById.get(record.id) ?? []).map((halo) => (
                <ellipse
                  key={`${record.id}:${halo.label}`}
                  className="group-halo"
                  cx={halo.cx}
                  cy={halo.cy}
                  rx={halo.rx}
                  ry={halo.ry}
                  transform={`rotate(${halo.rotateDeg.toFixed(1)} ${halo.cx.toFixed(1)} ${halo.cy.toFixed(1)})`}
                  style={{ fill: halo.color, stroke: halo.color }}
                />
              ))}
            </g>
          ))}
          {crossLinks.map((link) => {
            const from = nodePoint(link.fromSearchId, link.fromNodeId);
            const to = nodePoint(link.toSearchId, link.toNodeId);
            if (!from || !to) return null;
            return (
              <path
                key={`${link.fromNodeId}->${link.toNodeId}`}
                className="cross-line"
                d={edgePath(from, to, 0.4)}
              />
            );
          })}
          {searches.map((record) => {
            const positions = positionsById.get(record.id) ?? [];
            const trailFrom = record.linkFrom ? anchorPoint(record.linkFrom) : null;
            return (
              <g key={record.id}>
                {trailFrom ? (
                  <path
                    className="trail-line"
                    d={edgePath(trailFrom, record.origin, 0.6)}
                  />
                ) : null}
                {record.branches.map((node, i) => (
                  <path
                    key={`${node.id}:${layout}`}
                    className={`branch-line${node.status === "pending" ? " pending" : ""}`}
                    pathLength={1}
                    d={edgePath(record.origin, positions[i], i % 2 === 0 ? 1 : -1)}
                    style={{ stroke: branchGroupColor(node.agentType) }}
                  />
                ))}
              </g>
            );
          })}
        </svg>
        {/* halo captions live in the DOM layer, above cards, so a
            neighboring card can never hide them */}
        {searches.map((record) =>
          (halosById.get(record.id) ?? []).map((halo) => (
            <span
              key={`label-${record.id}:${halo.label}`}
              className="halo-label"
              style={{ left: halo.labelX, top: halo.labelY, color: halo.color }}
            >
              {halo.label}
            </span>
          )),
        )}
        {searches.map((record) => {
          const positions = positionsById.get(record.id) ?? [];
          return (
            <div className="cluster" key={record.id} data-status={record.status}>
              <CenterNode
                query={record.query}
                node={record.center}
                pos={record.origin}
                resolvedCount={
                  record.branches.filter((b) => b.status !== "pending").length
                }
                errorMessage={record.errorMessage}
                onSelect={() => {
                  flyTo(record.origin);
                  setSelected({ searchId: record.id, nodeId: record.center.id });
                }}
              />
              {record.branches.map((node, i) => (
                <BranchNode
                  key={node.id}
                  node={node}
                  pos={positions[i]}
                  onSelect={(nodeId) =>
                    setSelected({ searchId: record.id, nodeId })
                  }
                />
              ))}
            </div>
          );
        })}
      </div>
      {selectedNode ? (
        <DetailPanel
          key={selectedNode.node.id}
          query={selectedNode.record.query}
          node={selectedNode.node}
          onClose={() => setSelected(null)}
        />
      ) : null}
      <p className="canvas-hint">drag to pan · scroll to zoom · search again to grow the map</p>
    </div>
  );
}
