import { createHash } from "node:crypto";
import { Hono } from "hono";
import { z } from "zod";
import { setSettlementOverrides } from "@x402/hono";
import type { Config } from "../config.js";

const inputSchema = z.object({
  message: z.string().min(1).max(10_000),
});

// Price per input byte in USDC smallest units (6 decimals).
// 10 units/byte = $0.00001/byte → max 10KB input = $0.10 (below the $0.50 default ceiling).
const PRICE_PER_BYTE_USDC_UNITS = 10n;

export function createMeterRoute(config: Config) {
  const route = new Hono();

  route.post("/meter", async (c) => {
    const raw = await c.req.json().catch(() => null);
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) {
      return c.json({ error: "Invalid input", details: parsed.error.issues }, 400);
    }
    const { message } = parsed.data;

    // ★ CUSTOMIZE — Replace this block with your real metered work.
    // The upto scheme pattern: do the work, measure its cost, signal the
    // actual charge via setSettlementOverrides. The middleware settles the
    // smaller of (your actual charge, the client's pre-authorized ceiling).
    const bytesProcessed = Buffer.byteLength(message, "utf8");
    const hash = createHash("sha256").update(message).digest("hex");
    const output = `sha256:${hash}`;
    const chargedUnits = BigInt(bytesProcessed) * PRICE_PER_BYTE_USDC_UNITS;

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
