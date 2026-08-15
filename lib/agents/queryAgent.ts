import type { AgentResult } from "@/lib/types";
import { agentRunner } from "@/lib/agents/agentRunner";

export function queryAgent(subQuery: string, signal?: AbortSignal): Promise<AgentResult> {
  return agentRunner("web_search", [subQuery], signal);
}
