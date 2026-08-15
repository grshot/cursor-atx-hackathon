# Hierarchical DAG is a third layout, not adaptive retrieval

Subject-depth hierarchy (abstract → specifics) must not become dynamic agent scaling (spec out of scope).

**Status:** accepted

**Decision:** `layoutByDepth` over the same result set. Depth-0 concept nodes are layout-only (`concept:<slug>`), derived from `parentConcept` tags, not new Grok calls. Toggle: by-source | by-subtopic | by-depth. If enrichment is missing, by-depth falls back to by-subtopic.

**Considered Options:** Recursive sub-agents per topic; replace existing layouts; force-directed only — chose third static layout.

**Consequences:** Phase 8’s two layouts remain. Phase 12 only adds positions + ephemeral concept nodes. Fan-out stays fixed at 6.

**Reversal triggers:** Depth must invent new evidence (then that’s a new retrieval phase, not a layout).
