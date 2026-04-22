import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { runHello } from "../../work/hello.js";

// ★ CUSTOMIZE — MCP adapter for the `hello` skill.
// Pure adapter: calls runHello, wraps its output in an MCP content array.

export function registerHelloTool(server: McpServer) {
  server.registerTool(
    "hello",
    {
      description: "Returns a greeting. Costs $0.01 USDC per call (x402 exact scheme).",
      inputSchema: { name: z.string().optional() },
    },
    async ({ name }) => {
      const { message } = runHello(name);
      return { content: [{ type: "text", text: message }] };
    },
  );
}
