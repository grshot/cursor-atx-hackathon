import type { AgentResult } from "@/lib/types";
import { agentRunner } from "@/lib/agents/agentRunner";

export function xAgent(subQueries: [string, string, string]): Promise<AgentResult> {
  return agentRunner("x_search", subQueries);
}
