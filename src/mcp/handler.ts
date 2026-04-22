import { Hono } from "hono";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { buildMCPServer } from "./server.js";
import type { Config } from "../config.js";

// Hono route handler for MCP Streamable HTTP (stateless, JSON responses).
// Each request gets a fresh McpServer + transport — matches the SDK's
// stateless-mode documented pattern.

export function createMCPRoutes(config: Config) {
  const app = new Hono<{ Variables: { parsedBody?: unknown } }>();

  app.all("/mcp", async (c) => {
    const server = buildMCPServer({ c, config });
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    await server.connect(transport);
    // Upstream middleware may have pre-parsed the body (for gating). Pass it
    // through so the transport doesn't try to read the already-consumed stream.
    const parsedBody = c.get("parsedBody");
    return transport.handleRequest(
      c.req.raw,
      parsedBody !== undefined ? { parsedBody } : undefined,
    );
  });

  return app;
}
