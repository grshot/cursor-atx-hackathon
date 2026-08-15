import { xai, extractMessage } from "@/lib/llm/xai";

// Fast preliminary answer for the center node: a plain Grok call with NO
// search tools, so it skips the 35–115s tool latency entirely and lands in
// seconds. It's model-knowledge only — the UI labels it a "quick take" and
// the real cited synthesis replaces it when the agents finish.
export async function quickTake(query: string, signal?: AbortSignal): Promise<string> {
  const prompt = `Give a brief, direct first-take answer (3-4 sentences) to this question from your existing knowledge. No preamble, no hedging boilerplate, no markdown formatting. This is a fast preliminary answer shown to the user while live research agents are still running.

Question: "${query}"`;

  const response = await xai.callResponses(prompt, undefined, signal);
  const { text } = extractMessage(response);
  const trimmed = text.trim();
  if (!trimmed) throw new Error("quick take returned empty text");
  return trimmed;
}
