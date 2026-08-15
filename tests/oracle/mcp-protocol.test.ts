import { test } from "node:test";
import assert from "node:assert/strict";
import { read } from "./helpers.ts";

const SERVER = "mcp-server/index.ts";
const skip = `behavioral: ${SERVER} not built`;

test("oracle:PROTO-01 messages are JSON-RPC 2.0", { skip }, () => {});

test(
  "oracle:PROTO-02 request ids are string or number, never null",
  { skip },
  () => {},
);

test(
  "oracle:PROTO-03 successful results include result.resultType",
  { skip },
  () => {},
);

test(
  "oracle:PROTO-04 errors include integer code and message",
  { skip },
  () => {},
);

test("oracle:PROTO-05 notifications omit id", { skip }, () => {});

test(
  "oracle:PROTO-06 server is stateless: each request is self-contained",
  { skip },
  () => {},
);

test(
  "oracle:PROTO-07 missing required _meta (protocolVersion, clientCapabilities) is rejected with -32602",
  { skip },
  () => {},
);

test(
  "oracle:PROTO-08 undeclared client capability required by the server returns -32021",
  { skip },
  () => {},
);

test(
  "oracle:PROTO-09 responses SHOULD include io.modelcontextprotocol/serverInfo",
  { skip },
  () => {},
);

test("oracle:VER-01 server implements server/discover", { skip }, () => {});

test(
  "oracle:VER-02 discover.supportedVersions includes 2026-07-28",
  { skip },
  () => {},
);

test(
  "oracle:VER-03 unsupported protocol version returns -32022 with a supported list",
  { skip },
  () => {},
);

test(
  "oracle:VER-04 discover.capabilities advertises tools",
  { skip },
  () => {},
);

test(
  "oracle:VER-05 dual-era initialize handshake for legacy Cursor clients",
  {
    skip: `${SERVER} not built; Cursor chat may still speak pre-2026-07-28 initialize — decide dual-era vs modern-only at implementation`,
  },
  () => {},
);

test(
  "oracle:STDIO-01 newline-delimited JSON-RPC on stdin/stdout",
  { skip },
  () => {},
);

test(
  "oracle:STDIO-02 stdout contains only valid MCP messages (no logs)",
  { skip },
  () => {},
);

test(
  "oracle:STDIO-03 logs MAY go to stderr",
  { skip },
  () => {},
);

test(
  "oracle:STDIO-04 server SHOULD exit when stdin hits EOF",
  { skip },
  () => {},
);

test(
  "oracle:STDIO-05 stdio credentials come from the environment, not HTTP OAuth",
  { skip: `${SERVER} not built; spec: stdio SHOULD NOT follow HTTP authorization` },
  () => {},
);

test("oracle:TOOL-01 discover/capabilities declare tools", { skip }, () => {});

test("oracle:TOOL-02 server responds to tools/list", { skip }, () => {});

test(
  "oracle:TOOL-03 tools/list returns the single search tool with name, description, inputSchema",
  { skip },
  () => {},
);

test(
  "oracle:TOOL-04 tools/list order is deterministic",
  { skip },
  () => {},
);

test("oracle:TOOL-05 tools/call accepts name + arguments", { skip }, () => {});

test(
  "oracle:TOOL-06 inputSchema is a JSON Schema object (not null), default dialect 2020-12",
  { skip },
  () => {},
);

test(
  "oracle:TOOL-07 tool name matches [A-Za-z0-9_.-]{1,128}",
  { skip },
  () => {},
);

test(
  "oracle:TOOL-08 tool has a human-readable description",
  { skip },
  () => {},
);

test(
  "oracle:TOOL-09 graph payload is in structuredContent",
  { skip },
  () => {},
);

test(
  "oracle:TOOL-10 structured result SHOULD also include serialized JSON as text content",
  { skip },
  () => {},
);

test(
  "oracle:TOOL-11 outputSchema for {nodes, edges, citations} is declared and results conform",
  { skip },
  () => {},
);

test(
  "oracle:TOOL-12 unknown tool name is a protocol error -32602",
  { skip },
  () => {},
);

test(
  "oracle:TOOL-13 orchestration/API failures are tool execution errors (isError: true), not protocol errors",
  { skip },
  () => {},
);

test(
  "oracle:TOOL-14 invalid arguments (missing query, wrong type) are tool execution or -32602 errors",
  { skip },
  () => {},
);

test(
  "oracle:TOOL-15 tool output does not leak GROK_API_KEY or other secrets",
  { skip },
  () => {},
);

test(
  "oracle:TOOL-16 server MUST support JSON Schema 2020-12 for tool schemas",
  { skip },
  () => {},
);

test(
  "oracle:TOOL-17 tools/list set does not vary per connection (stateless list)",
  { skip },
  () => {},
);

test("oracle:SEC-01 server validates all tool inputs", { skip }, () => {});

test(
  "oracle:SEC-02 access control: stdio process only; no unauthenticated HTTP surface",
  { skip },
  () => {},
);

test(
  "oracle:SEC-03 tool invocations are rate-limited",
  { skip: `${SERVER} not built; spec Tools · Security Considerations MUST rate-limit` },
  () => {},
);

test("oracle:SEC-04 tool outputs are sanitized", { skip }, () => {});

test(
  "oracle:SEC-05 README documents security implications of running the server locally",
  () => {
    const readme = read("mcp-server/README.md");
    assert.match(readme, /Security/);
    assert.match(readme, /stdio/i);
  },
);

test(
  "oracle:SEC-06 tool annotations, if any, are not treated as trusted policy",
  { skip: `${SERVER} not built; product need not emit annotations` },
  () => {},
);

test(
  "oracle:CXL-01 stdio notifications/cancelled SHOULD stop an in-flight orchestrate()",
  { skip: `${SERVER} not built; orchestrate() is long-running so cancellation matters` },
  () => {},
);

test(
  "oracle:PROG-01 progress notifications for a long tools/call are optional",
  { skip: `${SERVER} not built; Progress is OPTIONAL in the spec` },
  () => {},
);
