import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ADR0001,
  ISSUE_12,
  ISSUE_13,
  ISSUE_TRACK3,
  PLAN,
  SPEC,
  exists,
  read,
} from "./helpers.ts";

test("oracle:SRC-01 issue 3, 12, and 13 source files exist", () => {
  assert.equal(exists(ISSUE_TRACK3), true, "track 3 description");
  assert.equal(exists(ISSUE_12), true, "issue 12 academic agent");
  assert.equal(exists(ISSUE_13), true, "issue 13 MCP server");
});

test("oracle:TRK-01 second entry point is academic agent plus MCP tool", () => {
  const track = read(ISSUE_TRACK3);
  assert.match(track, /academic agent/i);
  assert.match(track, /MCP server/);
  assert.match(track, /scout_search/);
  assert.match(track, /Cursor's agent chat/);
});

test(
  "oracle:TRK-02 tool is callable from Cursor agent chat",
  { skip: "mcp-server/index.ts not built; Cursor-host E2E is also not automatable here" },
  () => {},
);

test("oracle:TRK-03 start against Phase 1 academic-agent and orchestrate stubs", () => {
  assert.equal(exists("api/academic-agent.py"), true);
  assert.equal(exists("lib/orchestration/orchestrate.ts"), true);
  assert.equal(exists("mcp-server/package.json"), true);
  assert.match(read("api/academic-agent.py"), /api\.semanticscholar\.org/);
  assert.match(read("lib/orchestration/orchestrate.ts"), /export async function\* orchestrate/);
});

test(
  "oracle:TRK-04 swap stub orchestrate() for the real Phase 2/3 generator",
  { skip: "orchestrate() is still the Phase 1 FAKE_AGENTS generator" },
  () => {},
);

test("oracle:TRK-05 MCP and web app share one orchestrate() module", () => {
  assert.match(
    read("mcp-server/index.ts"),
    /from ["']\.\.\/lib\/orchestration\/orchestrate["']/,
  );
});

test("oracle:NAME-01 tool name is scout_search across Track 3, issue 13, plan, spec, and ADR", () => {
  const files = {
    track3: read(ISSUE_TRACK3),
    issue13: read(ISSUE_13),
    plan: read(PLAN),
    spec: read(SPEC),
    adr0001: read(ADR0001),
    mcpPkg: read("mcp-server/package.json"),
    context: read("CONTEXT.md"),
  };
  for (const [name, src] of Object.entries(files)) {
    assert.match(src, /scout_search/, name);
    assert.doesNotMatch(src, /agentic_graph_search/, name);
  }
});
