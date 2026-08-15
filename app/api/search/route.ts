import { orchestrate } from "@/lib/orchestration/orchestrate";
import type { GraphEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

const encoder = new TextEncoder();

/**
 * SSE wire format for Phase 7 (`hooks/useSearchStream.ts`):
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

  const iterator = orchestrate(query, { signal: request.signal });

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
