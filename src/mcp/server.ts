import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Context } from "hono";
import { registerHelloTool } from "./tools/hello.js";
import { registerMeterTool } from "./tools/meter.js";
import type { Config } from "../config.js";

// Build a per-request McpServer with all skills registered.
// Stateless mode: server + transport rebuilt per request (see handler.ts).
// Tools that need the Hono context close over `deps.c`.

export function buildMCPServer(deps: { c: Context; config: Config }): McpServer {
  const server = new McpServer({
    name: "a2a-x402-agent-template",
    version: "0.1.0",
  });
  registerHelloTool(server);
  registerMeterTool(server, deps);
  return server;
}
