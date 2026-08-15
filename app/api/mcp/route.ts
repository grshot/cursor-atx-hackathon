import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createScoutServer } from "../../../mcp-server/server";

// MCP SDK needs Node APIs; orchestrate() fans out 6 agents + a synthesis
// call that alone runs ~29s. 300s is the max on Hobby/Pro with Fluid
// Compute (Vercel's default) — fine here, but confirm Fluid Compute is on
// if this ever times out at the legacy 60s (Hobby) / 300s-without-Fluid cap.
export const runtime = "nodejs";
export const maxDuration = 300;

function isAuthorized(request: Request): boolean {
  const token = process.env.SCOUT_MCP_TOKEN;
  if (!token) return false;
  return request.headers.get("authorization") === `Bearer ${token}`;
}

async function handle(request: Request): Promise<Response> {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const server = createScoutServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  await server.connect(transport);

  return transport.handleRequest(request);
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
