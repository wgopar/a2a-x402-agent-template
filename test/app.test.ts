import { describe, it, expect } from "vitest";
import { createApp } from "../src/app.js";
import type { Config } from "../src/config.js";

const testConfig: Config = {
  walletAddress: "0xtest",
  privateKey: "0xkey",
  network: "eip155:84532",
  rpcUrl: "https://sepolia.base.org",
  facilitatorUrl: "https://x402.org/facilitator",
  agentName: "Test Agent",
  agentDescription: "A test agent",
  agentUrl: "http://localhost:3000",
  port: 3000,
};

describe("Hono app routes", () => {
  const app = createApp(testConfig);

  it("GET /health returns 200", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
  });

  it("GET /.well-known/agent-card.json returns valid card", async () => {
    const res = await app.request("/.well-known/agent-card.json");
    expect(res.status).toBe(200);
    const card = await res.json();
    expect(card.name).toBe("Test Agent");
    expect(card.skills).toHaveLength(1);
    expect(card.url).toContain("/a2a");
  });

  it("GET /api/hello without payment returns 402", async () => {
    const res = await app.request("/api/hello");
    // x402 middleware should return 402 Payment Required
    expect(res.status).toBe(402);
  });
});
