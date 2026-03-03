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
  ];
}
