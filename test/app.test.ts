import { describe, it, expect } from "vitest";
import { createApp } from "../src/app.js";
import { createPaymentMiddleware } from "../src/payments/x402.js";
import type { Config } from "../src/config.js";

const testConfig: Config = {
  walletAddress: "0xtest",
  privateKey: "0xkey",
  network: "eip155:84532",
  rpcUrl: "https://sepolia.base.org",
  agentName: "Test Agent",
  agentDescription: "A test agent",
  agentUrl: "http://localhost:3000",
  port: 3000,
  bypassPayments: true,
};

describe("Hono app routes", () => {
  const app = createApp(testConfig);

  it("GET /health returns 200", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
  });

  it("GET /.well-known/agent-card.json returns valid card with entrypoints", async () => {
    const res = await app.request("/.well-known/agent-card.json");
    expect(res.status).toBe(200);
    const card = await res.json();
    expect(card.name).toBe("Test Agent");
    expect(card.skills).toHaveLength(1);
    expect(card.url).toContain("/a2a");
    expect(card.entrypoints).toBeDefined();
    expect(card.entrypoints.length).toBeGreaterThan(0);
  });

  it("GET /.well-known/agent-registration.json returns identity linkage", async () => {
    const res = await app.request("/.well-known/agent-registration.json");
    expect(res.status).toBe(200);
    const reg = await res.json();
    expect(reg.network).toBe("eip155:84532");
    expect(reg.walletAddress).toBe("0xtest");
    expect(reg.agentId).toBeNull();
  });

  it("GET /api/hello returns 200 (payments bypassed)", async () => {
    const res = await app.request("/api/hello");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe("Hello, World!");
  });

  it("POST /api/hello with valid input returns greeting", async () => {
    const res = await app.request("/api/hello", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Alice" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe("Hello, Alice!");
  });

  it("POST /api/hello with invalid input returns 400", async () => {
    const res = await app.request("/api/hello", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: 123 }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid input");
  });

  it("POST /a2a with malformed JSON returns -32700", async () => {
    const res = await app.request("/a2a", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe(-32700);
  });

  it("POST /a2a without application/json content-type returns -32600", async () => {
    const res = await app.request("/a2a", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "{}",
    });
    expect(res.status).toBe(415);
    const body = await res.json();
    expect(body.error.code).toBe(-32600);
  });

  it("POST /a2a tasks/get does not require payment", async () => {
    const res = await app.request("/a2a", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "2",
        method: "tasks/get",
        params: { id: "nonexistent" },
      }),
    });
    expect(res.status).not.toBe(402);
  });
});

describe("createPaymentMiddleware — scheme registration", () => {
  const cfgWithCdp: Config = {
    ...testConfig,
    bypassPayments: false,
    cdpApiKeyId: "test-id",
    cdpApiKeySecret: "test-secret",
  };
  const noSync = { syncFacilitatorOnStart: false };

  it("accepts an exact-scheme route (default)", () => {
    expect(() =>
      createPaymentMiddleware(
        cfgWithCdp,
        [{ path: "GET /api/hello", price: "$0.01", description: "Hello" }],
        noSync,
      ),
    ).not.toThrow();
  });

  it("accepts an upto-scheme route", () => {
    expect(() =>
      createPaymentMiddleware(
        cfgWithCdp,
        [
          {
            path: "POST /api/llm",
            scheme: "upto",
            price: "$0.50",
            description: "LLM inference, metered",
          },
        ],
        noSync,
      ),
    ).not.toThrow();
  });
});
