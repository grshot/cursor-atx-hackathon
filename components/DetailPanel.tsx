"use client";

import { Fragment, useEffect, useState } from "react";
import type { GraphNode } from "@/lib/types";
import { branchGroupColor, branchLabel } from "@/components/BranchNode";
import {
  citationTitle,
  citedSegments,
  cleanErrorMessage,
  excerptOf,
} from "@/lib/format";

type Props = {
  query: string;
  node: GraphNode;
  onClose: () => void;
};

function CitedText({
  text,
  numberByUrl,
}: {
  text: string;
  numberByUrl: Map<string, number>;
}) {
  return (
    <p className="panel-text">
      {citedSegments(text).map((segment, i) =>
        segment.kind === "text" ? (
          <Fragment key={i}>{segment.value}</Fragment>
        ) : (
          <a
            key={i}
            className="cite-inline"
            href={segment.url}
            target="_blank"
            rel="noreferrer"
          >
            [{numberByUrl.get(segment.url) ?? segment.label}]
          </a>
        ),
      )}
    </p>
  );
}

export function DetailPanel({ query, node, onClose }: Props) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isCenter = node.kind === "center";
  const isError = node.status === "error";
  const citations = node.citations ?? [];
  // Dedupe by URL; numbering is list position, and inline [n] markers are
  // renumbered through the same map so text and list always agree.
  const numberByUrl = new Map<string, number>();
  const uniqueCitations = citations.filter((c) => {
    if (numberByUrl.has(c.url)) return false;
    numberByUrl.set(c.url, numberByUrl.size + 1);
    return true;
  });

  const fullText = node.synthesis ?? "";
  const excerpt = excerptOf(fullText);
  const isLong = excerpt.length < fullText.length;

  return (
    <aside className="detail-panel">
      <div className="panel-head">
        <div className="panel-title">
          {!isCenter ? (
            <span
              className="node-dot"
              style={{ background: branchGroupColor(node.agentType) }}
            />
          ) : null}
          <h2>{isCenter ? "Synthesized answer" : branchLabel(node)}</h2>
        </div>
        <button
          type="button"
          className="panel-close"
          onClick={onClose}
          aria-label="Close details"
        >
          ✕
        </button>
      </div>
      <p className="panel-query">“{query}”</p>
      <div className="panel-body">
        {isError ? (
          <p className="panel-error">
            {cleanErrorMessage(node.errorMessage ?? "This agent did not return a result.")}
          </p>
        ) : (
          <>
            <CitedText
              text={expanded || !isLong ? fullText : excerpt}
              numberByUrl={numberByUrl}
            />
            {isLong ? (
              <button
                type="button"
                className="panel-expand"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? "‹ show excerpt" : "read full report ›"}
              </button>
            ) : null}
          </>
        )}
        {uniqueCitations.length > 0 ? (
          <>
            <h3 className="panel-sub">
              {uniqueCitations.length}{" "}
              {uniqueCitations.length === 1 ? "source" : "sources"}
            </h3>
            <ul className="panel-citations">
              {uniqueCitations.map((citation) => (
                <li key={citation.url}>
                  <span className="cite-num">[{numberByUrl.get(citation.url)}]</span>
                  <a href={citation.url} target="_blank" rel="noreferrer">
                    {citationTitle(citation)}
                  </a>
                  <span className="cite-source">{citation.source}</span>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </aside>
  );
}
