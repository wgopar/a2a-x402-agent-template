import { z } from "zod";
import type { Context } from "hono";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { setSettlementOverrides } from "@x402/hono";
import { runMeter } from "../../work/meter.js";
import type { Config } from "../../config.js";

// ★ CUSTOMIZE — MCP adapter for the `meter` skill.
// Closes over the Hono context so it can call setSettlementOverrides
// (the x402 upto partial-settlement signal). Pattern B from
// docs/mcp-library-evaluation.md.

export function registerMeterTool(
  server: McpServer,
  deps: { c: Context; config: Config },
) {
  server.registerTool(
    "meter",
    {
      description:
        "Metered compute demo (SHA-256 + byte count). Priced via the x402 upto scheme — pay up to $0.50 ceiling, charged per byte at settlement.",
      inputSchema: { message: z.string().min(1).max(10_000) },
    },
    async ({ message }) => {
      const result = runMeter(message);
      if (!deps.config.bypassPayments && result.chargedUnits > 0n) {
        setSettlementOverrides(deps.c, { amount: result.chargedUnits.toString() });
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              output: result.output,
              bytesProcessed: result.bytesProcessed,
              chargedUnits: result.chargedUnits.toString(),
            }),
          },
        ],
      };
    },
  );
}
