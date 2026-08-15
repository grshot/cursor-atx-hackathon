import type { AgentResult } from "@/lib/types";

// Pulled forward from Phase 4 (Teammate B) so Phase 3's orchestrate() has
// all 6 agents to fan out to. POSTs to api/academic-agent, currently the
// Phase 1 mock — Phase 4 swaps the Python backend for real Semantic Scholar
// calls behind this same contract; this wrapper shouldn't need to change.
function resolveBaseUrl(): string {
  if (process.env.API_BASE_URL) return process.env.API_BASE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

const CALL_TIMEOUT_MS = 120_000;

export async function academicAgent(
  subQueries: string[],
  signal?: AbortSignal
): Promise<AgentResult> {
  const timeout = AbortSignal.timeout(CALL_TIMEOUT_MS);
  const res = await fetch(`${resolveBaseUrl()}/api/academic-agent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subQueries }),
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  if (!res.ok) {
    throw new Error(`academic-agent error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}
