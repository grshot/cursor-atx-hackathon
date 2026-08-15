import { test } from "node:test";
import assert from "node:assert/strict";
import { read } from "./helpers.ts";

const notOffered = "out of Track 3 / issue 13 scope — server is a single stdio tool";

test("oracle:RES-01 resources primitive is not required", { skip: notOffered }, () => {});

test("oracle:PRMPT-01 prompts primitive is not required", { skip: notOffered }, () => {});

test("oracle:ELIC-01 elicitation is not required", { skip: notOffered }, () => {});

test("oracle:SAMP-01 sampling is not required (deprecated in 2026-07-28)", { skip: notOffered }, () => {});

test("oracle:ROOT-01 roots are not required (deprecated in 2026-07-28)", { skip: notOffered }, () => {});

test(
  "oracle:HTTP-01 Streamable HTTP transport is not required (Cursor local MCP is stdio)",
  { skip: notOffered },
  () => {},
);

test(
  "oracle:AUTH-01 HTTP OAuth/authorization framework is not required on stdio",
  { skip: notOffered },
  () => {},
);

test("oracle:PAG-01 pagination is not required (one tool)", { skip: notOffered }, () => {});

test("oracle:LOG-01 MCP logging utility is not required (deprecated)", { skip: notOffered }, () => {});

test("oracle:COMP-01 argument completion is not required", { skip: notOffered }, () => {});

test("oracle:CACHE-01 list-result caching/TTL is not required", { skip: notOffered }, () => {});

test("oracle:SUB-01 subscriptions/listen is not required (static tool list)", { skip: notOffered }, () => {});

test("oracle:MRTR-01 multi round-trip / InputRequiredResult is not required", { skip: notOffered }, () => {});

test("oracle:EXT-01 protocol extensions (Tasks, Apps, Skills) are not required", { skip: notOffered }, () => {});

test("oracle:REG-01 publishing to the MCP Registry is not required", { skip: notOffered }, () => {});

test(
  "oracle:TASK-01 Tasks extension is not required (handler drains orchestrate() synchronously)",
  { skip: notOffered },
  () => {},
);

test("oracle:APPS-01 MCP Apps UI extension is not required", { skip: notOffered }, () => {});

test(
  "oracle:DEP-01 changelog / deprecated-feature migration is N/A until a server exists",
  { skip: "no MCP server to migrate" },
  () => {},
);

test("oracle:SCHEMA-01 implementation types align with schema.ts 2026-07-28 (via official SDK)", () => {
  const pkg = JSON.parse(read("mcp-server/package.json")) as {
    dependencies?: Record<string, string>;
  };
  assert.ok(pkg.dependencies?.["@modelcontextprotocol/sdk"]);
  assert.match(read("mcp-server/index.ts"), /@modelcontextprotocol\/sdk/);
});

test("oracle:TECH-01 MCP TypeScript SDK is the server implementation", () => {
  const pkg = JSON.parse(read("mcp-server/package.json")) as {
    dependencies?: Record<string, string>;
  };
  assert.ok(pkg.dependencies?.["@modelcontextprotocol/sdk"]);
});

test("oracle:TECH-02 academic agent is Python on Vercel serverless", () => {
  const src = read("api/academic-agent.py");
  assert.match(src, /class handler\(BaseHTTPRequestHandler\)/);
});

test("oracle:TECH-03 academic retrieval is Semantic Scholar, not a Grok tool", () => {
  const src = read("api/academic-agent.py");
  assert.match(src, /api\.semanticscholar\.org/);
  assert.doesNotMatch(src, /web_search|x_search|api\.x\.ai/);
});

test(
  "oracle:TECH-04 protocol revision targeted is 2026-07-28",
  { skip: "mcp-server not built; cannot advertise supportedVersions yet" },
  () => {},
);

test("oracle:TECH-05 no LangChain dependency in the MCP or academic packages", () => {
  for (const rel of ["package.json", "mcp-server/package.json"]) {
    const pkg = JSON.parse(read(rel)) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const names = [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})];
    assert.equal(names.some((n) => /langchain/i.test(n)), false, rel);
  }
  assert.doesNotMatch(read("api/academic-agent.py"), /langchain/i);
});

test("oracle:CQ-01 academic agent stays near the planned ~150 lines / 2 files", () => {
  const py = read("api/academic-agent.py").split("\n").length;
  const ts = read("lib/agents/academicAgent.ts").split("\n").length;
  assert.ok(py + ts < 400, `academic files too large: ${py + ts}`);
});

test("oracle:CQ-02 MCP server stays near the planned ~180 lines / 3 files", () => {
  const index = read("mcp-server/index.ts").split("\n").length;
  const assemble = read("mcp-server/assemble.ts").split("\n").length;
  assert.ok(index + assemble < 400, `mcp files too large: ${index + assemble}`);
});

test(
  "oracle:DEL-01 Phase 4 PR opened with a real AgentResult sample",
  { skip: "no academic-agent implementation or PR yet" },
  () => {},
);

test(
  "oracle:DEL-02 Phase 5 PR opened with Cursor agent-chat verification",
  { skip: "no MCP server implementation or PR yet" },
  () => {},
);

test("oracle:DESIGN-01 CONTEXT.md distinguishes host agent from MCP tool", () => {
  const ctx = read("CONTEXT.md");
  assert.match(ctx, /host agent/i);
  assert.match(ctx, /scout_search/);
});

test("oracle:DESIGN-02 product spec requires MCP structured graph result", () => {
  const spec = read("specs/2032e2-agentic-graph-search.md");
  assert.match(spec, /MCP server exposes the orchestration as a callable tool/);
  assert.match(spec, /nodes\/edges\/citations/);
});
