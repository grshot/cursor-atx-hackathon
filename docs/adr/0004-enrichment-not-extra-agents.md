# Enrichment layer, not extra agents

Want X engagement ratios, paper abstracts, auto-tags, similarity, and edges *between answers* without breaking fixed fan-out.

**Status:** accepted

**Decision:** Deterministic per-source extractors + one post-fan-out Grok tagging/relatedness pass. Relationship edges are first-class `GraphEdge`s with `kind` (`agrees_with` | `contradicts` | `elaborates` | `same_topic`). Similarity = model score + tag Jaccard as a deterministic tie-break. Extractors degrade to `unavailable` if API payloads lack fields (especially X likes/replies). Not a 7th retrieval agent. Not TurboPuffer.

**Considered Options:** 7th agent; TurboPuffer for similarity; extra Grok call per citation — chose one batch pass + extractors.

**Consequences:** `AgentResult` / `Citation` gain optional `features` and `tags`. Graph events stay additive (`enrichment_updated` or fields on `center_updated`). Leaf sort order uses extractor rank (X ratio, academic cite count, else model score).

**Reversal triggers:** `x_search` never returns engagement and X-ratio is a must-have demo (then a dedicated X stats API, which is a new signup).
