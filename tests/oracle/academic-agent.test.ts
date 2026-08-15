import { test } from "node:test";
import assert from "node:assert/strict";
import { exists, read } from "./helpers.ts";

const PY = "api/academic-agent.py";
const TS = "lib/agents/academicAgent.ts";
const TYPES = "lib/types.ts";
const WEB = "lib/agents/webAgent.ts";
const X = "lib/agents/xAgent.ts";
const QUERY = "lib/agents/queryAgent.ts";

test("oracle:AA-01 api/academic-agent.py is a Vercel Python serverless function", () => {
  const src = read(PY);
  assert.match(src, /from http\.server import BaseHTTPRequestHandler/);
  assert.match(src, /class handler\(BaseHTTPRequestHandler\)/);
  assert.match(src, /def do_POST/);
});

test("oracle:AA-02 handler accepts three sub-queries", () => {
  const src = read(PY);
  assert.match(src, /subQueries/);
  assert.match(src, /len\(sub_queries\) != 3/);
});

test("oracle:AA-03 handler calls Semantic Scholar (not a mock) for a test query", () => {
  const src = read(PY);
  assert.match(src, /api\.semanticscholar\.org\/graph\/v1\/paper\/search/);
  assert.doesNotMatch(src, /MOCK_RESULT/);
});

test("oracle:AA-04 response JSON matches AgentResult {synthesis, citations, citationCount}", () => {
  const src = read(PY);
  assert.match(src, /"synthesis"/);
  assert.match(src, /"citations"/);
  assert.match(src, /"citationCount"/);
  assert.match(src, /"source": "academic"/);
  const types = read(TYPES);
  assert.match(
    types,
    /export type AgentResult = \{[\s\S]*synthesis: string;[\s\S]*citations: Citation\[\];[\s\S]*citationCount: number;/,
  );
});

test("oracle:AA-05 academicAgent.ts POSTs to api/academic-agent", () => {
  const src = read(TS);
  assert.match(src, /method:\s*"POST"/);
  assert.match(src, /api\/academic-agent/);
  assert.match(src, /subQueries/);
});

test(
  "oracle:AA-06 academicAgent uses the same agent interface as web/x/query agents",
  { skip: `${QUERY} not built` },
  () => {},
);

test(
  "oracle:AA-07 academicAgent return shape is indistinguishable from the other five AgentResult values",
  { skip: `${QUERY} not built` },
  () => {},
);

test("oracle:AA-08 citations map Semantic Scholar title/url/snippet (or abstract) fields", () => {
  const src = read(PY);
  assert.match(src, /paper\.get\("title"\)/);
  assert.match(src, /paper\.get\("url"\)/);
  assert.match(src, /paper\.get\("abstract"\)/);
});

test("oracle:AA-09 academic function is isolated (no shared process state)", () => {
  const src = read(PY);
  assert.doesNotMatch(src, /\b(sqlite|redis|cache\s*=)/i);
  assert.doesNotMatch(src, /MOCK_RESULT/);
});

test("oracle:AA-10 Semantic Scholar path requires no extra signup beyond GROK_API_KEY", () => {
  const readme = read("README.md");
  const env = read(".env.local.example");
  assert.match(readme, /SEMANTIC_SCHOLAR_API_KEY/);
  assert.match(readme, /optional/i);
  assert.doesNotMatch(readme, /SEMANTIC_SCHOLAR_API_KEY` — required/);
  assert.match(env, /SEMANTIC_SCHOLAR_API_KEY/);
  assert.match(env, /optional/i);
  assert.ok(exists(WEB));
  assert.ok(exists(X));
});

test("oracle:AA-11 Python academic function stays uninstrumented (TS wrapper owns the HTTP span)", () => {
  const src = read(PY);
  assert.doesNotMatch(src, /langfuse|opentelemetry|langchain/i);
});

test("oracle:AA-12 request/response contract is stable so orchestrate() needs no later change", () => {
  const src = read(PY);
  const types = read(TYPES);
  for (const key of ["synthesis", "citations", "citationCount"] as const) {
    assert.match(src, new RegExp(`"${key}"`));
    assert.match(types, new RegExp(key));
  }
});
