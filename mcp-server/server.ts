import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { orchestrate } from "../lib/orchestration/orchestrate";
import { assembleScoutGraph } from "./assemble";

const inputSchema = {
  query: z.string().min(1),
};

async function scoutSearch(query: string) {
  const events = [];
  for await (const event of orchestrate(query)) {
    events.push(event);
    if (event.type === "done") break;
  }
  return assembleScoutGraph(events);
}

export function createScoutServer() {
  const server = new McpServer({
    name: "scout",
    version: "0.1.0",
  });

  server.registerTool(
    "scout_search",
    {
      title: "Scout search",
      description:
        "World search over the web, X, and academic papers. Returns a graph of branch answers plus citations. The host agent already has repo semSearch; this tool does not search or index the workspace.",
      inputSchema,
    },
    async ({ query }) => {
      try {
        const graph = await scoutSearch(query);
        const text = JSON.stringify(graph);
        return {
          content: [{ type: "text" as const, text }],
          structuredContent: graph,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("scout_search failed:", message);
        return {
          isError: true,
          content: [{ type: "text" as const, text: message }],
        };
      }
    },
  );

  return server;
}
