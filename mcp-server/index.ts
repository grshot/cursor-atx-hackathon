import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createScoutServer } from "./server";

const server = createScoutServer();
const transport = new StdioServerTransport();
await server.connect(transport);
