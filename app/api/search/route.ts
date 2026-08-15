import { orchestrate } from "@/lib/orchestration/orchestrate";
import type { GraphEvent, SessionContext } from "@/lib/types";

// Optional prior-session context: [{ query, synthesis }], capped so a
// malicious/buggy client can't stuff the prompt.
function parseContext(body: unknown): SessionContext | undefined {
  if (typeof body !== "object" || body === null || !("context" in body)) return undefined;
  const raw = (body as { context: unknown }).context;
  if (!Array.isArray(raw)) return undefined;
  const context: SessionContext = [];
  for (const item of raw.slice(0, 5)) {
    if (
      typeof item === "object" &&
      item !== null &&
      "query" in item &&
      "synthesis" in item &&
      typeof item.query === "string" &&
      typeof item.synthesis === "string"
    ) {
      context.push({
        query: item.query.slice(0, 300),
        synthesis: item.synthesis.slice(0, 600),
      });
    }
  }
  return context.length > 0 ? context : undefined;
}

export const dynamic = "force-dynamic";

const encoder = new TextEncoder();

/**
 * SSE wire format for Phase 7 (`hooks/useScoutSession.ts`):
 *   event: <GraphEvent.type>
 *   data: <GraphEvent JSON>
 *
 * `agent_error` is a normal event on this stream — it does not set an HTTP
 * error status or close the connection.
 */
function encodeSse(event: GraphEvent): Uint8Array {
  return encoder.encode(
    `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`,
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const query =
    typeof body === "object" &&
    body !== null &&
    "query" in body &&
    typeof body.query === "string"
      ? body.query.trim()
      : "";

  if (!query) {
    return Response.json(
      { error: "Body must be { query: string }" },
      { status: 400 },
    );
  }

  const iterator = orchestrate(query, {
    signal: request.signal,
    context: parseContext(body),
  });

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (request.signal.aborted) {
        await iterator.return(undefined);
        controller.close();
        return;
      }

      try {
        const { value, done } = await iterator.next();
        if (done || request.signal.aborted) {
          await iterator.return(undefined);
          controller.close();
          return;
        }
        controller.enqueue(encodeSse(value));
      } catch (error) {
        await iterator.return(undefined);
        controller.error(error);
      }
    },
    async cancel() {
      await iterator.return(undefined);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
