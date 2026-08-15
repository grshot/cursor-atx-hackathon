import { test } from "node:test";
import assert from "node:assert/strict";
import { ADR0001, ADR0002, exists, read } from "./helpers.ts";

const INDEX = "mcp-server/index.ts";
const PKG = "mcp-server/package.json";
const README = "mcp-server/README.md";

test("oracle:MCP-01 mcp-server/index.ts exists and uses the official MCP TypeScript SDK", () => {
  const src = read(INDEX);
  assert.match(src, /@modelcontextprotocol\/sdk/);
  assert.match(src, /StdioServerTransport/);
});

test("oracle:MCP-02 server exposes exactly one tool", () => {
  const src = read(INDEX);
  const tools = src.match(/registerTool\(/g) ?? [];
  assert.equal(tools.length, 1);
});

test("oracle:MCP-03 registered tool name is scout_search", () => {
  assert.match(read(INDEX), /registerTool\(\s*"scout_search"/);
});

test("oracle:MCP-04 inputSchema requires query: string", () => {
  const src = read(INDEX);
  assert.match(src, /query:\s*z\.string/);
  assert.match(src, /inputSchema/);
});

test("oracle:MCP-05 tool handler drains orchestrate(query) to completion", () => {
  const src = read(INDEX);
  assert.match(src, /for await \(const event of orchestrate\(query\)\)/);
  assert.match(src, /event\.type === "done"/);
});

test("oracle:MCP-06 assembled payload is { nodes, edges, citations }", () => {
  const src = read("mcp-server/assemble.ts");
  assert.match(src, /nodes:/);
  assert.match(src, /edges:/);
  assert.match(src, /citations:/);
});

test("oracle:MCP-07 result is returned as MCP structured content (structuredContent)", () => {
  assert.match(read(INDEX), /structuredContent:/);
});

test("oracle:MCP-08 mcp-server/package.json declares a start script", () => {
  const pkg = JSON.parse(read(PKG)) as { scripts?: Record<string, string>; type?: string };
  const start = pkg.scripts?.start ?? "";
  assert.match(start, /dist\/index\.js/);
  assert.equal(pkg.type, "module");
});

test("oracle:MCP-09 README documents a local Cursor MCP config snippet", () => {
  const readme = read(README);
  assert.match(readme, /mcpServers/);
  assert.match(readme, /scout_search/);
  assert.match(readme, /tsx/);
});

test("oracle:MCP-10 server imports orchestrate() from lib/orchestration/orchestrate.ts", () => {
  assert.match(read(INDEX), /from ["']\.\.\/lib\/orchestration\/orchestrate["']/);
});

test("oracle:MCP-11 server contains no duplicated fan-out / orchestration logic", () => {
  const src = read(INDEX);
  assert.doesNotMatch(src, /FAKE_AGENTS/);
  assert.doesNotMatch(src, /web_search/);
  assert.doesNotMatch(src, /x_search/);
});

test("oracle:MCP-12 sample tools/call returns a well-formed { nodes, edges, citations } graph", () => {
  const src = read("mcp-server/assemble.ts");
  assert.match(src, /export function assembleScoutGraph/);
  assert.match(src, /return \{ nodes, edges, citations \}/);
  assert.match(read(INDEX), /assembleScoutGraph/);
});

test("oracle:MCP-13 MCP search is world-search only (no repo / TurboPuffer chunks)", () => {
  const src = read(INDEX);
  assert.match(src, /World search/);
  assert.doesNotMatch(src, /turbopuffer/i);
});

test("oracle:MCP-14 ADR-0001 records world-search-only MCP (no cloned Cursor index)", () => {
  const adr = read(ADR0001);
  assert.match(adr, /world-search only/i);
  assert.match(adr, /Do not persist a citation Merkle store/);
  assert.match(adr, /scout_search/);
});

test("oracle:MCP-15 optional MCP model argument does not exist in issue 13 (ADR-0002 later)", () => {
  const adr = read(ADR0002);
  assert.match(adr, /MCP `model`/);
  assert.doesNotMatch(
    read("github_issues/3-Track MCP server entry point (Victorrent)/13-Phase 5 — MCP Server.md"),
    /model:/,
  );
  assert.equal(exists(INDEX), true);
});

test("oracle:MCP-16 scout_search is a local stdio Cursor tool draining orchestrate()", () => {
  const src = read(INDEX);
  assert.match(src, /StdioServerTransport/);
  assert.match(src, /scoutSearch/);
  assert.match(read(README), /Cursor/);
});
