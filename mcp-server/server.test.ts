import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createScoutServer } from "./server";

test("scout_search forwards orchestration events as MCP progress", async () => {
  const previousApiKey = process.env.GROK_API_KEY;
  delete process.env.GROK_API_KEY;

  const server = createScoutServer();
  const client = new Client({ name: "scout-test", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const progressMessages: string[] = [];

  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const result = await client.callTool(
      { name: "scout_search", arguments: { query: "test query" } },
      undefined,
      {
        onprogress: (update) => {
          if (update.message) progressMessages.push(update.message);
        },
        resetTimeoutOnProgress: true,
        timeout: 5_000,
      },
    );

    assert.equal(result.isError, undefined);
    assert.deepEqual(progressMessages, [
      "Starting Scout search",
      "Final synthesis ready",
      "Scout search complete",
    ]);
  } finally {
    await client.close();
    await server.close();
    if (previousApiKey === undefined) delete process.env.GROK_API_KEY;
    else process.env.GROK_API_KEY = previousApiKey;
  }
});
