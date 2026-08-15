# Compose with Cursor retrieval; do not clone TurboPuffer or Merkle

Cursor indexes workspaces with a Merkle tree of file hashes and stores chunk embeddings in TurboPuffer; the host agent already exposes `semSearch`. This product’s search is web/X/academic. Reimplementing that stack would add a vector DB, extra signups, and persistence the spec forbids.

**Status:** accepted

**Decision:** MCP `scout_search` is world-search only. Cursor’s index remains the repo. Node IDs + `queryId` are the only Merkle analogue (stable identity, one snapshot per run). Layout toggles reposition the same nodes; they do not re-query. Do not persist a citation Merkle store.

**Considered Options:** (1) TurboPuffer in-app (2) local embeddings (3) compose via host agent — chose 3.

**Consequences:** Web UI will not show repo chunks. Demo story is “Cursor indexes the repo; this tool indexes the rest of the internet.” Stretch phases (tracing, tags, depth layout) must not introduce a vector namespace to “make up for” this.

**Reversal triggers:** Judges need repo nodes without Cursor; or a 7th code agent is explicitly in-scope.
