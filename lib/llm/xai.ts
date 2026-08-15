// Shared low-level client for the xAI Responses API. Both the reasoning
// provider (subquery.ts, synthesis.ts) and the retrieval provider
// (agentRunner.ts) call through this — see ADR-0002.

const XAI_RESPONSES_URL = "https://api.x.ai/v1/responses";
const MODEL = "grok-4.6";

export type XaiTool = { type: "web_search" } | { type: "x_search" };

export type XaiResponse = {
  output: Array<{
    type: string;
    content?: Array<{
      type: string;
      text?: string;
      annotations?: Array<{
        type: string;
        url: string;
        start_index: number;
        end_index: number;
        title: string;
      }>;
    }>;
  }>;
};

async function callResponses(input: string, tools?: XaiTool[]): Promise<XaiResponse> {
  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) {
    throw new Error("GROK_API_KEY is not set");
  }

  const res = await fetch(XAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      input: [{ role: "user", content: input }],
      ...(tools ? { tools } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`xAI Responses API error ${res.status}: ${body}`);
  }

  return res.json();
}

// Extracts the final assistant message's text + citation annotations from a
// Responses API result. output[] mixes reasoning/*_search_call steps with one
// final {type:"message"} item — Grok gives no real citation titles, just
// bare URLs + a numeric label (confirmed in Phase 0).
export function extractMessage(response: XaiResponse): {
  text: string;
  annotations: Array<{ url: string; title: string }>;
} {
  const messageItem = response.output.find((item) => item.type === "message");
  const textBlock = messageItem?.content?.find((c) => c.type === "output_text");
  return {
    text: textBlock?.text ?? "",
    annotations: (textBlock?.annotations ?? []).map((a) => ({ url: a.url, title: a.title })),
  };
}

export const xai = { callResponses };
