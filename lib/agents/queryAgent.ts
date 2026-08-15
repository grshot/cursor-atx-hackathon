import type { AgentResult } from "@/lib/types";
import { agentRunner } from "@/lib/agents/agentRunner";

export function queryAgent(subQuery: string): Promise<AgentResult> {
  return agentRunner("web_search", [subQuery]);
}
