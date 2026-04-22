import { Hono } from "hono";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { buildMCPServer } from "./server.js";
import type { Config } from "../config.js";

// Hono route handler for MCP Streamable HTTP (stateless, JSON responses).
// Each request gets a fresh McpServer + transport — matches the SDK's
// stateless-mode documented pattern.

export function createMCPRoutes(config: Config) {
  const app = new Hono();

  app.all("/mcp", async (c) => {
    const server = buildMCPServer({ c, config });
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    await server.connect(transport);
    return transport.handleRequest(c.req.raw);
  });

  return app;
}
