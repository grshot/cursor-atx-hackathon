import type { AgentResult } from "@/lib/types";
import { agentRunner } from "@/lib/agents/agentRunner";

export function webAgent(subQueries: [string, string, string]): Promise<AgentResult> {
  return agentRunner("web_search", subQueries);
}
