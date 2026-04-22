import { describe, it, expect, beforeAll } from "vitest";
import { createMCPRoutes } from "../src/mcp/handler.js";
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

const JSON_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json, text/event-stream",
};

async function rpcCall(
  app: ReturnType<typeof createMCPRoutes>,
  body: Record<string, unknown>,
): Promise<{ status: number; json: Record<string, unknown> }> {
  const res = await app.request("/mcp", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : {} };
}

describe("MCP endpoint", () => {
  let app: ReturnType<typeof createMCPRoutes>;

  beforeAll(() => {
    app = createMCPRoutes(testConfig);
  });

  it("initialize returns protocol version and tools capability", async () => {
    const { status, json } = await rpcCall(app, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "test", version: "1" },
      },
    });
    expect(status).toBe(200);
    expect(json.result).toMatchObject({
      protocolVersion: expect.any(String),
      capabilities: expect.objectContaining({ tools: expect.any(Object) }),
      serverInfo: expect.objectContaining({ name: "a2a-x402-agent-template" }),
    });
  });

  it("tools/list returns hello and meter", async () => {
    const { status, json } = await rpcCall(app, {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
    });
    expect(status).toBe(200);
    const tools = (json.result as { tools: { name: string }[] }).tools;
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(["hello", "meter"]);
  });

  it("tools/call hello returns greeting", async () => {
    const { status, json } = await rpcCall(app, {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "hello", arguments: { name: "Alice" } },
    });
    expect(status).toBe(200);
    const content = (json.result as { content: { type: string; text: string }[] }).content;
    expect(content[0]).toEqual({ type: "text", text: "Hello, Alice!" });
  });

  it("tools/call meter returns hash and bytes", async () => {
    const { status, json } = await rpcCall(app, {
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: { name: "meter", arguments: { message: "hello world" } },
    });
    expect(status).toBe(200);
    const content = (json.result as { content: { type: string; text: string }[] }).content;
    const payload = JSON.parse(content[0].text);
    expect(payload.output).toBe(
      "sha256:b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
    );
    expect(payload.bytesProcessed).toBe(11);
    expect(payload.chargedUnits).toBe("110");
  });
});
