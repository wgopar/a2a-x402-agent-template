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
  meterMaxPricePerRequest: "$0.50",
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
    expect(card.skills).toHaveLength(2);
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

  it("POST /api/meter hashes input and reports bytes + charged units", async () => {
    const res = await app.request("/api/meter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "hello world" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.output).toBe(
      "sha256:b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
    );
    expect(body.bytesProcessed).toBe(11);
    expect(body.chargedUnits).toBe("110");
  });

  it("POST /api/meter rejects empty body with 400", async () => {
    const res = await app.request("/api/meter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/meter rejects oversize input with 400", async () => {
    const res = await app.request("/api/meter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "a".repeat(10_001) }),
    });
    expect(res.status).toBe(400);
  });

  it("agent card includes meter skill", async () => {
    const res = await app.request("/.well-known/agent-card.json");
    const card = await res.json();
    const ids = card.skills.map((s: { id: string }) => s.id);
    expect(ids).toContain("meter");
  });

  it("POST /mcp initialize works through the full app pipeline", async () => {
    const res = await app.request("/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "integration", version: "1" },
        },
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result.serverInfo.name).toBe("a2a-x402-agent-template");
  });

  it("POST /mcp tools/call meter (bypass mode) returns hash", async () => {
    const res = await app.request("/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "meter", arguments: { message: "hello world" } },
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    const payload = JSON.parse(body.result.content[0].text);
    expect(payload.bytesProcessed).toBe(11);
    expect(payload.chargedUnits).toBe("110");
  });

  it("agent card entrypoints includes mcp", async () => {
    const res = await app.request("/.well-known/agent-card.json");
    const card = await res.json();
    const ids = card.entrypoints.map((e: { id: string }) => e.id);
    expect(ids).toContain("mcp");
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
            path: "POST /api/meter",
            scheme: "upto",
            price: "$0.50",
            description: "Metered compute, priced via upto",
          },
        ],
        noSync,
      ),
    ).not.toThrow();
  });
});
