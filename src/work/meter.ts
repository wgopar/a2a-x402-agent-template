import { createHash } from "node:crypto";

// ★ CUSTOMIZE — Replace this block with your real metered work.
// The upto scheme pattern: do the work, measure its cost, return `chargedUnits`.
// Surface adapters (HTTP / A2A / MCP) call setSettlementOverrides with the
// chargedUnits value to tell the x402 middleware the actual charge.

// Price per input byte in USDC smallest units (6 decimals).
// 10 units/byte = $0.00001/byte → max 10KB input = $0.10 (below the $0.50 default ceiling).
export const PRICE_PER_BYTE_USDC_UNITS = 10n;

export interface MeterResult {
  output: string;
  bytesProcessed: number;
  chargedUnits: bigint;
}

export function runMeter(message: string): MeterResult {
  const bytesProcessed = Buffer.byteLength(message, "utf8");
  const hash = createHash("sha256").update(message).digest("hex");
  const output = `sha256:${hash}`;
  const chargedUnits = BigInt(bytesProcessed) * PRICE_PER_BYTE_USDC_UNITS;
  return { output, bytesProcessed, chargedUnits };
}
