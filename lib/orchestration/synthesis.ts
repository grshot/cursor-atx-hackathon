import { xai, extractMessage } from "@/lib/llm/xai";
import type { AgentResult } from "@/lib/types";

// Final Grok call: combines all resolved AgentResults into one synthesized
// answer for the center node. Runs after all 6 agents have settled.
export async function synthesize(query: string, results: AgentResult[]): Promise<string> {
  const numbered = results.map((r, i) => `Agent ${i + 1} findings:\n${r.synthesis}`).join("\n\n");
  const prompt = `The user's original query was: "${query}"

Here are ${results.length} independent research syntheses from different agents covering different sources/angles:

${numbered}

Write ONE comprehensive answer to the user's original query that synthesizes these findings — do not just concatenate them. Respond with plain text only (no citations; those are tracked separately per agent).`;

  const response = await xai.callResponses(prompt);
  const { text } = extractMessage(response);
  return text;
}
