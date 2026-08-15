import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { orchestrate } from "../lib/orchestration/orchestrate";
import type { GraphEvent } from "../lib/types";
import { assembleScoutGraph } from "./assemble";

const inputSchema = {
  query: z.string().min(1),
};

const PROGRESS_HEARTBEAT_MS = 30_000;

function progressMessage(event: GraphEvent): string {
  switch (event.type) {
    case "center_pulse":
      return "Starting Scout search";
    case "center_preview":
      return "Quick take ready; scouts are still researching";
    case "subqueries_ready":
      return "Research plan ready; running six scouts";
    case "branch_node_added":
      return `${event.node.agentType ?? event.node.id} scout finished`;
    case "agent_error":
      return `${event.agentType} scout finished with an error`;
    case "center_updated":
      return "Final synthesis ready";
    case "done":
      return "Scout search complete";
    default: {
      const _never: never = event;
      return `Scout progress: ${JSON.stringify(_never)}`;
    }
  }
}

async function scoutSearch(
  query: string,
  options?: {
    signal?: AbortSignal;
    onEvent?: (event: GraphEvent) => Promise<void>;
  },
) {
  const events = [];
  for await (const event of orchestrate(query, { signal: options?.signal })) {
    events.push(event);
    await options?.onEvent?.(event);
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
    async ({ query }, extra) => {
      const progressToken = extra._meta?.progressToken;
      let progress = 0;
      let progressEnabled = progressToken !== undefined;
      let progressQueue: Promise<void> = Promise.resolve();

      // Serialize notifications so their monotonically increasing progress
      // values arrive in order. Progress is optional, so a notification
      // transport failure must not turn an otherwise valid search into an
      // error result.
      const reportProgress = (message: string): Promise<void> => {
        if (!progressEnabled || extra.signal.aborted) return Promise.resolve();

        progressQueue = progressQueue.then(async () => {
          if (
            !progressEnabled ||
            extra.signal.aborted ||
            progressToken === undefined
          ) {
            return;
          }
          try {
            await extra.sendNotification({
              method: "notifications/progress",
              params: {
                progressToken,
                progress: ++progress,
                message,
              },
            });
          } catch (error) {
            progressEnabled = false;
            const message = error instanceof Error ? error.message : String(error);
            console.error("scout_search progress notification failed:", message);
          }
        });
        return progressQueue;
      };

      // A single upstream call can run up to 120s (CALL_TIMEOUT_MS in
      // lib/llm/xai.ts), long enough to trip client-side MCP idle timeouts.
      // Event notifications alone leave a race at that boundary; keep the
      // request active between semantic graph events.
      const heartbeat = progressEnabled
        ? setInterval(() => {
            void reportProgress("Scout search is still running");
          }, PROGRESS_HEARTBEAT_MS)
        : undefined;

      try {
        const graph = await scoutSearch(query, {
          signal: extra.signal,
          onEvent: (event) => reportProgress(progressMessage(event)),
        });
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
      } finally {
        if (heartbeat) clearInterval(heartbeat);
        await progressQueue;
      }
    },
  );

  return server;
}
