import type { AgentType, GraphNode } from "@/lib/types";

// World-coordinate layout for the constellation canvas. Positions are fixed
// at placement time (not measured from the DOM), so edges can be computed
// directly from coordinates and never need a rAF measuring loop.

export type WorldPoint = { x: number; y: number };

export type GraphLayout = "source" | "angle";

export const SLOT_ANGLES = [-90, -30, 30, 90, 150, 210];

// Two arrangements of the same six nodes around their center:
// "source" pairs each aggregate with its kin (web+angle1, x+angle3,
// academic+angle2); "angle" leads with the three sub-query angles at the
// cardinal slots and tucks the aggregates between them.
export const SLOT_ORDERS: Record<GraphLayout, AgentType[]> = {
  source: ["web", "query1", "x", "query3", "academic", "query2"],
  angle: ["query1", "web", "query2", "x", "query3", "academic"],
};

// Ellipse the branch cards sit on, around their cluster's center.
export const RING_RX = 440;
export const RING_RY = 310;

// How far a follow-up search's center lands from the previous one. Must
// clear two branch rings plus card width so neighboring clusters don't kiss.
const TRAIL_DX = 1350;
const TRAIL_DY = 1080;

// Trail directions used when a follow-up query doesn't clearly match any
// branch of the previous graph — a gentle rightward wander.
const DEFAULT_TRAIL_ANGLES = [14, -26, 32, -8];

export function slotAngle(
  agentType: AgentType | undefined,
  fallback: number,
  layout: GraphLayout = "source",
): number {
  const order = SLOT_ORDERS[layout];
  const index = agentType ? order.indexOf(agentType) : -1;
  return SLOT_ANGLES[index === -1 ? fallback % SLOT_ANGLES.length : index];
}

// Source layout: equidistant ring, but each source pair (aggregate + its kin
// angle) is pulled angularly together — three tight duos instead of an even
// hexagon.
const SOURCE_PAIR_ANGLES: Record<AgentType, number> = {
  web: -84,
  query1: -36,
  x: 36,
  query3: 84,
  academic: 156,
  query2: 204,
};

// Angle layout: the same duo treatment but grouped by angle — each angle
// scout paired with one aggregate (the aggregates cover every angle, so each
// lends its breadth to one angle's neighborhood).
const ANGLE_PAIR_ANGLES: Record<AgentType, number> = {
  query1: -84,
  web: -36,
  query2: 36,
  x: 84,
  query3: 156,
  academic: 204,
};

// Stable pseudo-random in [0, 1) from a node id, so organic jitter doesn't
// reshuffle on every render.
function hash01(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return (h >>> 0) % 1000 / 1000;
}

// Positions for every branch of one cluster, aligned by index with `branches`.
// "source": equidistant radius, pair-clustered angles. "angle": even angular
// spread but organic radii — the more sources a scout returned, the closer it
// is pulled toward the center (evidence gravity), with a stable per-node
// angular jitter so the ring never looks stamped.
export function branchPositions(
  origin: WorldPoint,
  branches: GraphNode[],
  layout: GraphLayout,
): WorldPoint[] {
  if (layout === "source") {
    return branches.map((node, i) => {
      const deg = node.agentType
        ? SOURCE_PAIR_ANGLES[node.agentType]
        : SLOT_ANGLES[i % SLOT_ANGLES.length];
      const rad = (deg * Math.PI) / 180;
      return {
        x: origin.x + Math.cos(rad) * RING_RX,
        y: origin.y + Math.sin(rad) * RING_RY,
      };
    });
  }

  const maxCites = Math.max(
    1,
    ...branches.map((b) => (b.status === "ok" ? (b.citationCount ?? 0) : 0)),
  );
  return branches.map((node, i) => {
    const baseDeg = node.agentType
      ? ANGLE_PAIR_ANGLES[node.agentType]
      : SLOT_ANGLES[i % SLOT_ANGLES.length];
    const jitter = (hash01(node.id) - 0.5) * 10;
    const cites = node.status === "ok" ? (node.citationCount ?? 0) : 0;
    const radiusScale =
      node.status === "ok"
        ? Math.min(1.16, Math.max(0.76, 1.16 - 0.42 * (cites / maxCites)))
        : 1;
    const rad = ((baseDeg + jitter) * Math.PI) / 180;
    return {
      x: origin.x + Math.cos(rad) * RING_RX * radiusScale,
      y: origin.y + Math.sin(rad) * RING_RY * radiusScale,
    };
  });
}

// Curved edge between two world points, bending perpendicular to the segment.
export function edgePath(from: WorldPoint, to: WorldPoint, bendSign: number): string {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const bend = dist * 0.12 * bendSign;
  const cx = mx + (-dy / dist) * bend;
  const cy = my + (dx / dist) * bend;
  return `M${from.x.toFixed(1)},${from.y.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${to.x.toFixed(1)},${to.y.toFixed(1)}`;
}

const STOPWORDS = new Set([
  "the", "and", "for", "that", "this", "with", "from", "what", "when", "where",
  "which", "how", "why", "who", "are", "was", "were", "will", "would", "could",
  "should", "have", "has", "had", "does", "did", "about", "into", "over",
  "under", "between", "actually", "really", "can", "its", "their",
  "there", "than", "then", "them", "they", "you", "your", "our", "not", "but",
  "all", "any", "more", "most", "some", "such", "very", "just", "also",
]);

function significantTokens(text: string): Set<string> {
  const tokens = new Set<string>();
  for (const raw of text.toLowerCase().split(/[^a-z0-9]+/)) {
    if (raw.length > 2 && !STOPWORDS.has(raw)) tokens.add(raw);
  }
  return tokens;
}

// ---------- group halos ----------

export type Halo = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rotateDeg: number;
  color: string;
  label: string;
  labelX: number;
  labelY: number;
};

const GROUP_COLOR_VARS = [
  "var(--group-a)",
  "var(--group-b)",
  "var(--group-c)",
] as const;

// What counts as a visible "group" depends on the layout: source mode circles
// each source family (aggregate + its kin angle); angle mode circles the three
// angle scouts alone — the aggregates deliberately span all angles.
const HALO_GROUPS: Record<
  GraphLayout,
  { label: string; members: AgentType[]; color: number }[]
> = {
  source: [
    { label: "web scouts", members: ["web", "query1"], color: 0 },
    { label: "x scouts", members: ["x", "query3"], color: 1 },
    { label: "academic scouts", members: ["academic", "query2"], color: 2 },
  ],
  angle: [
    { label: "angle 1", members: ["query1", "web"], color: 0 },
    { label: "angle 2", members: ["query2", "x"], color: 2 },
    { label: "angle 3", members: ["query3", "academic"], color: 1 },
  ],
};

// Labels sit OUTSIDE the halo, pushed away from the cluster's center so they
// never hide under the center card or a neighboring node.
function outwardLabel(
  origin: WorldPoint,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rotateDeg: number,
): { labelX: number; labelY: number } {
  const dirRad = Math.atan2(cy - origin.y, cx - origin.x);
  const phi = dirRad - (rotateDeg * Math.PI) / 180;
  const edge =
    (rx * ry) /
    Math.sqrt((ry * Math.cos(phi)) ** 2 + (rx * Math.sin(phi)) ** 2);
  return {
    labelX: cx + Math.cos(dirRad) * (edge + 30),
    labelY: cy + Math.sin(dirRad) * (edge + 30) + 4,
  };
}

export function groupHalos(
  origin: WorldPoint,
  branches: GraphNode[],
  positions: WorldPoint[],
  layout: GraphLayout,
  angleLabels?: readonly [string, string, string] | null,
): Halo[] {
  const halos: Halo[] = [];
  HALO_GROUPS[layout].forEach((def, groupIndex) => {
    const pts = def.members
      .map((member) => {
        const i = branches.findIndex((b) => b.agentType === member);
        return i === -1 ? null : positions[i];
      })
      .filter((p): p is WorldPoint => p !== null);
    if (pts.length === 0) return;
    const color = GROUP_COLOR_VARS[def.color];
    const label =
      layout === "angle" && angleLabels?.[groupIndex]
        ? angleLabels[groupIndex]
        : def.label;

    if (pts.length === 1) {
      const p = pts[0];
      halos.push({
        cx: p.x,
        cy: p.y,
        rx: 185,
        ry: 140,
        rotateDeg: 0,
        color,
        label,
        ...outwardLabel(origin, p.x, p.y, 185, 140, 0),
      });
      return;
    }

    const [a, b] = pts;
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const rotateDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
    const rx = dist / 2 + 180;
    const ry = 150;
    halos.push({
      cx,
      cy,
      rx,
      ry,
      rotateDeg,
      color,
      label,
      ...outwardLabel(origin, cx, cy, rx, ry, rotateDeg),
    });
  });
  return halos;
}

// ---------- cross-cluster links ----------

// Threads that stitch the constellations together: a resolved branch links to
// its most similar resolved branch in any OLDER search, when the similarity
// is strong enough to mean something. One best link per branch keeps it a
// web, not a hairball.
export type CrossLink = {
  fromSearchId: string;
  fromNodeId: string;
  toSearchId: string;
  toNodeId: string;
};

export function computeCrossLinks(
  searches: { id: string; branches: GraphNode[] }[],
): CrossLink[] {
  const links: CrossLink[] = [];
  const tokenCache = new Map<string, Set<string>>();
  const tokensFor = (node: GraphNode): Set<string> => {
    let tokens = tokenCache.get(node.id);
    if (!tokens) {
      tokens = significantTokens(node.synthesis ?? "");
      tokenCache.set(node.id, tokens);
    }
    return tokens;
  };

  for (let j = 1; j < searches.length; j++) {
    for (const branch of searches[j].branches) {
      if (branch.status !== "ok" || !branch.synthesis) continue;
      const branchTokens = tokensFor(branch);
      if (branchTokens.size === 0) continue;

      let best: CrossLink | null = null;
      let bestShared = 0;
      let bestSim = 0;
      for (let i = 0; i < j; i++) {
        for (const other of searches[i].branches) {
          if (other.status !== "ok" || !other.synthesis) continue;
          const otherTokens = tokensFor(other);
          if (otherTokens.size === 0) continue;
          let shared = 0;
          for (const token of branchTokens) {
            if (otherTokens.has(token)) shared += 1;
          }
          const sim = shared / Math.min(branchTokens.size, otherTokens.size);
          if (shared > bestShared || (shared === bestShared && sim > bestSim)) {
            bestShared = shared;
            bestSim = sim;
            best = {
              fromSearchId: searches[i].id,
              fromNodeId: other.id,
              toSearchId: searches[j].id,
              toNodeId: branch.id,
            };
          }
        }
      }
      if (best && bestShared >= 4 && bestSim >= 0.22) links.push(best);
    }
  }
  return links;
}

// The trail's semantic anchor: which node of the parent graph the follow-up
// grew from. Rendered position is resolved at draw time so it tracks the
// active layout. agentType null = anchored to the parent's center.
export type TrailAnchor = {
  parentId: string;
  agentType: AgentType | null;
};

export type Placement = {
  origin: WorldPoint;
  linkFrom: TrailAnchor | null;
};

type PrevSearch = {
  id: string;
  origin: WorldPoint;
  branches: GraphNode[];
};

function bestMatchingBranch(query: string, prev: PrevSearch): GraphNode | null {
  const queryTokens = significantTokens(query);
  if (queryTokens.size === 0) return null;

  let best: GraphNode | null = null;
  let bestScore = 0;
  for (const branch of prev.branches) {
    if (branch.status !== "ok" || !branch.synthesis) continue;
    const branchTokens = significantTokens(branch.synthesis);
    let score = 0;
    for (const token of queryTokens) {
      if (branchTokens.has(token)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = branch;
    }
  }
  // Require at least two shared meaningful words before steering the trail —
  // one shared token is usually just the topic word repeating.
  return bestScore >= 2 ? best : null;
}

// The map reads left-to-right like an expedition trail, so every follow-up
// advances rightward: a matched branch keeps its vertical tendency but its
// horizontal component is clamped forward instead of doubling back.
function rightwardRad(angleDeg: number): number {
  const rad = (angleDeg * Math.PI) / 180;
  return Math.atan2(Math.sin(rad), Math.max(Math.cos(rad), 0.45));
}

export function placeSearch(
  query: string,
  prev: PrevSearch | null,
  index: number,
  occupied: WorldPoint[],
): Placement {
  if (!prev) return { origin: { x: 0, y: 0 }, linkFrom: null };

  const match = bestMatchingBranch(query, prev);
  const baseDeg = match
    ? slotAngle(match.agentType, 0)
    : DEFAULT_TRAIL_ANGLES[index % DEFAULT_TRAIL_ANGLES.length];
  const linkFrom: TrailAnchor = {
    parentId: prev.id,
    agentType: match?.agentType ?? null,
  };

  // Nudge the direction until the new origin clears every existing cluster.
  for (let attempt = 0; attempt < 8; attempt++) {
    const nudge = attempt % 2 === 0 ? attempt * 24 : -attempt * 24;
    const rad = rightwardRad(baseDeg + nudge);
    const origin = {
      x: prev.origin.x + Math.cos(rad) * TRAIL_DX,
      y: prev.origin.y + Math.sin(rad) * TRAIL_DY,
    };
    const collides = occupied.some(
      (p) => Math.abs(p.x - origin.x) < 1000 && Math.abs(p.y - origin.y) < 800,
    );
    if (!collides) return { origin, linkFrom };
  }

  // Every direction is crowded — push further out along the base direction.
  const rad = rightwardRad(baseDeg);
  return {
    origin: {
      x: prev.origin.x + Math.cos(rad) * TRAIL_DX * 1.7,
      y: prev.origin.y + Math.sin(rad) * TRAIL_DY * 1.7,
    },
    linkFrom,
  };
}
