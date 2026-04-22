import { Hono } from "hono";
import { z } from "zod";
import { setSettlementOverrides } from "@x402/hono";
import { runMeter } from "../work/meter.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  message: z.string().min(1).max(10_000),
});

export function createMeterRoute(config: Config) {
  const route = new Hono();

  route.post("/meter", async (c) => {
    const raw = await c.req.json().catch(() => null);
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) {
      return c.json({ error: "Invalid input", details: parsed.error.issues }, 400);
    }

    const { output, bytesProcessed, chargedUnits } = runMeter(parsed.data.message);

    if (!config.bypassPayments && chargedUnits > 0n) {
      setSettlementOverrides(c, { amount: chargedUnits.toString() });
    }

    return c.json({
      output,
      bytesProcessed,
      chargedUnits: chargedUnits.toString(),
    });
  });

  return route;
}
