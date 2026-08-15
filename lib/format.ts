// Agent syntheses come back with light markdown (bold, headers, inline
// citation links like `[[1]](https://…)`) that the cards render as plain
// text — strip the markup and markers; the citation list lives in the
// detail panel, not inline.
export function stripMarkdown(text: string): string {
  return text
    .replace(/\[\[?\d+\]?\]\s*\(\s*https?:\/\/[^)\s]+\s*\)/g, "")
    .replace(/\[\[?\d+\]?\]/g, "")
    .replace(/\(\s*https?:\/\/[^)\s]+\s*\)/g, "")
    .replace(/\[([^\]]+)\]\(\s*https?:\/\/[^)\s]+\s*\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ---------- inline citations ----------

export type TextSegment =
  | { kind: "text"; value: string }
  | { kind: "cite"; label: string; url: string };

const CITE_LINK = /\[\[?(\d+)\]?\]\s*\(\s*(https?:\/\/[^)\s]+)\s*\)/g;

// Splits a synthesis into plain-text runs and citation markers so the panel
// can render `[[1]](url)` as a small hyperlinked [1] instead of stripping it.
export function citedSegments(text: string): TextSegment[] {
  const cleaned = text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/`([^`]+)`/g, "$1");

  const segments: TextSegment[] = [];
  let last = 0;
  for (const match of cleaned.matchAll(CITE_LINK)) {
    const index = match.index ?? 0;
    if (index > last) segments.push({ kind: "text", value: cleaned.slice(last, index) });
    segments.push({ kind: "cite", label: match[1], url: match[2] });
    last = index + match[0].length;
  }
  if (last < cleaned.length) segments.push({ kind: "text", value: cleaned.slice(last) });

  // Leftover bare markers / stray URL parentheses in the text runs.
  return segments.map((segment) =>
    segment.kind === "text"
      ? {
          ...segment,
          value: segment.value
            .replace(/\[\[?\d+\]?\]/g, "")
            .replace(/\(\s*https?:\/\/[^)\s]+\s*\)/g, "")
            .replace(/[ \t]+\n/g, "\n")
            .replace(/\n{3,}/g, "\n\n"),
        }
      : segment,
  );
}

// First paragraphs up to ~maxChars, cut at a paragraph boundary (or a
// sentence boundary if the first paragraph alone is huge).
export function excerptOf(text: string, maxChars = 460): string {
  if (text.length <= maxChars) return text;
  const paragraphs = text.split(/\n\n+/);
  let out = "";
  for (const paragraph of paragraphs) {
    if (out && out.length + paragraph.length > maxChars) break;
    out = out ? `${out}\n\n${paragraph}` : paragraph;
    if (out.length >= maxChars) break;
  }
  if (out.length > maxChars * 1.4) {
    const cut = out.slice(0, maxChars);
    const sentenceEnd = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf(".\n"));
    if (sentenceEnd > maxChars * 0.5) out = cut.slice(0, sentenceEnd + 1);
  }
  return out;
}

// Truncate a phrase to ~max chars at a word boundary for use as a label.
export function shortLabel(text: string, max = 30): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  const cut = trimmed.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > max * 0.5 ? lastSpace : max)}…`;
}

// Halo caption for an angle: the sub-query minus the topic itself (every
// cluster is already about the topic) and any dangling connector words, so
// "history and origins of the four-day work week" → "history and origins"
// instead of a mid-word ellipsis.
const DANGLING = /\s+(of|for|the|a|an|and|around|about|to|in|on|with|behind)\s*$/i;

export function angleLabel(subQuery: string, query: string): string {
  let label = subQuery.trim();
  const topic = query.trim();
  if (topic) {
    const index = label.toLowerCase().indexOf(topic.toLowerCase());
    if (index !== -1) {
      label = `${label.slice(0, index)} ${label.slice(index + topic.length)}`.trim();
    }
  }
  label = label.replace(/[\s,:;–—-]+$/g, "");
  let previous = "";
  while (previous !== label) {
    previous = label;
    label = label.replace(DANGLING, "").trim();
  }
  if (!label) label = subQuery.trim();
  return shortLabel(label, 42);
}

// ---------- source titles ----------

function humanizeSlug(slug: string): string {
  const words = decodeURIComponent(slug)
    .replace(/\.(html?|php|aspx?|pdf|md)$/i, "")
    .replace(/[-_+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// Grok's web/x search returns bare URLs, so server titles are often just the
// hostname — derive something richer from the URL structure. A real title
// from an API (e.g. Semantic Scholar) is kept as-is.
export function citationTitle(citation: { url: string; title: string }): string {
  try {
    const url = new URL(citation.url);
    const host = url.hostname.replace(/^www\./, "");

    const serverTitle = citation.title?.trim() ?? "";
    if (
      serverTitle &&
      serverTitle !== host &&
      serverTitle !== url.hostname &&
      !/^\d+$/.test(serverTitle)
    ) {
      return serverTitle;
    }

    if (host === "x.com" || host === "twitter.com") {
      const [user] = url.pathname.split("/").filter(Boolean);
      return user && user !== "i" ? `@${user} on X` : "post on X";
    }
    if (host.endsWith("wikipedia.org")) {
      const page = url.pathname.split("/").filter(Boolean).pop();
      return page && page !== "wiki" ? `${humanizeSlug(page)} — Wikipedia` : host;
    }

    const segments = url.pathname
      .split("/")
      .filter(Boolean)
      .filter((segment) => !/^\d+$/.test(segment));
    const lastSegment = segments.pop();
    if (lastSegment) {
      const slug = humanizeSlug(lastSegment);
      if (slug.length > 4 && /[a-z] [a-z]/i.test(slug)) {
        return `${slug} · ${host}`;
      }
    }
    return host;
  } catch {
    return citation.title || citation.url;
  }
}

// Upstream failures can carry whole HTML error pages (e.g. a 404 body);
// collapse them to something a human can read on a card.
export function cleanErrorMessage(message: string): string {
  const htmlStart = message.search(/<!DOCTYPE|<html/i);
  if (htmlStart !== -1) {
    const prefix = message.slice(0, htmlStart).replace(/\s+/g, " ").trim();
    return prefix
      ? `${prefix} (endpoint returned an HTML error page)`
      : "Endpoint returned an HTML error page instead of a result.";
  }
  const stripped = message.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return stripped.length > 220 ? `${stripped.slice(0, 220)}…` : stripped;
}
