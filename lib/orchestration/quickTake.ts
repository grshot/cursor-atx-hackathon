import { xai, extractMessage, FAST_MODEL } from "@/lib/llm/xai";
import type { SessionContext } from "@/lib/types";

// Fast preliminary answer for the center node: a plain Grok call with NO
// search tools on the non-reasoning model (~2.7s measured), so the center
// fills in seconds. It's model-knowledge only — the UI labels it a "quick
// take" and the real cited synthesis replaces it when the agents finish.
export async function quickTake(
  query: string,
  signal?: AbortSignal,
  context?: SessionContext,
): Promise<string> {
  const contextLines =
    context && context.length > 0
      ? `\n\nFor context, earlier in this session the user already searched: ${context
          .map((c) => `"${c.query}"`)
          .join(", ")} — answer the new question in that light where relevant.`
      : "";

  const prompt = `Give a brief, direct first-take answer (3-4 sentences) to this question from your existing knowledge. No preamble, no hedging boilerplate, no markdown formatting. This is a fast preliminary answer shown to the user while live research agents are still running.

Question: "${query}"${contextLines}`;

  const response = await xai.callResponses(prompt, undefined, signal, FAST_MODEL);
  const { text } = extractMessage(response);
  const trimmed = text.trim();
  if (!trimmed) throw new Error("quick take returned empty text");
  return trimmed;
}
