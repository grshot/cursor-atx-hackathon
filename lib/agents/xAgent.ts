import type { AgentResult } from "@/lib/types";
import { agentRunner } from "@/lib/agents/agentRunner";

export function xAgent(
  subQueries: [string, string, string],
  signal?: AbortSignal
): Promise<AgentResult> {
  return agentRunner("x_search", subQueries, signal);
}
