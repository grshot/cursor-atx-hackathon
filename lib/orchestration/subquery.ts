import { xai, extractMessage } from "@/lib/llm/xai";

// Reasoning-provider call (no tools) that splits a user query into exactly
// 3 sub-query angles, fanned out to the 3 query-agents in Phase 3 and used
// as the shared sub-query set for the web/X/academic aggregate agents.
export async function generateSubQueries(
  query: string,
  signal?: AbortSignal
): Promise<[string, string, string]> {
  const prompt = `Given this search query, generate exactly 3 distinct sub-query angles that together give comprehensive coverage of the topic (e.g. origins/background, current state/debate, future outlook — adapt the angles to fit the actual query).

Respond with ONLY a JSON array of exactly 3 short strings (each a standalone search query), no other text.

Query: "${query}"`;

  const response = await xai.callResponses(prompt, undefined, signal);
  const { text } = extractMessage(response);

  const parsed = parseSubQueries(text);
  if (parsed) return parsed;

  throw new Error(`Could not parse 3 sub-queries from reasoning response: ${text}`);
}

function parseSubQueries(text: string): [string, string, string] | null {
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try {
      const arr = JSON.parse(jsonMatch[0]);
      if (Array.isArray(arr) && arr.length === 3 && arr.every((s) => typeof s === "string")) {
        return arr as [string, string, string];
      }
    } catch {
      // fall through to line-based parsing
    }
  }

  const lines = text
    .split("\n")
    .map((line) => line.replace(/^[\s\-*\d.)]+/, "").trim())
    .filter(Boolean);
  if (lines.length >= 3) {
    return [lines[0], lines[1], lines[2]];
  }

  return null;
}
