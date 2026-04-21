// ★ CUSTOMIZE — Define structured entrypoints for agent discovery

export interface Entrypoint {
  id: string;
  method: string;
  url: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  pricing?: { amount: string; currency: string; protocol: string };
}

export function buildEntrypoints(baseUrl: string): Entrypoint[] {
  const base = baseUrl.replace(/\/$/, "");
  return [
    {
      id: "hello",
      method: "GET",
      url: `${base}/api/hello`,
      description: "Returns a Hello World greeting",
      pricing: { amount: "0.01", currency: "USDC", protocol: "x402" },
    },
    {
      id: "meter",
      method: "POST",
      url: `${base}/api/meter`,
      description: "Metered compute demo priced via x402 upto",
      pricing: { amount: "upTo:0.50", currency: "USDC", protocol: "x402" },
    },
  ];
}
