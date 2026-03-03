import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  const original = { ...process.env };

  beforeEach(() => {
    process.env.WALLET_ADDRESS = "0x1234567890abcdef";
    process.env.PRIVATE_KEY = "0xdeadbeef";
  });

  afterEach(() => {
    process.env = { ...original };
  });

  it("loads required env vars", async () => {
    const config = await loadConfig();
    expect(config.walletAddress).toBe("0x1234567890abcdef");
    expect(config.privateKey).toBe("0xdeadbeef");
  });

  it("applies defaults for optional vars", async () => {
    const config = await loadConfig();
    expect(config.network).toBe("eip155:84532");
    expect(config.port).toBe(3000);
    expect(config.agentName).toBe("Hello Agent");
    expect(config.bypassPayments).toBe(false);
  });

  it("throws on missing WALLET_ADDRESS", async () => {
    delete process.env.WALLET_ADDRESS;
    await expect(loadConfig()).rejects.toThrow("WALLET_ADDRESS");
  });

  it("throws on missing PRIVATE_KEY", async () => {
    delete process.env.PRIVATE_KEY;
    await expect(loadConfig()).rejects.toThrow("PRIVATE_KEY");
  });

  it("reads BYPASS_PAYMENTS flag", async () => {
    process.env.BYPASS_PAYMENTS = "true";
    const config = await loadConfig();
    expect(config.bypassPayments).toBe(true);
  });

  it("throws if BYPASS_PAYMENTS=true in production", async () => {
    process.env.BYPASS_PAYMENTS = "true";
    process.env.NODE_ENV = "production";
    await expect(loadConfig()).rejects.toThrow("not allowed in production");
  });

  it("reads AGENT_ID as number", async () => {
    process.env.AGENT_ID = "2458";
    const config = await loadConfig();
    expect(config.agentId).toBe(2458);
  });

  it("reads CDP API key fields", async () => {
    process.env.CDP_API_KEY_ID = "key-id";
    process.env.CDP_API_KEY_SECRET = "key-secret";
    const config = await loadConfig();
    expect(config.cdpApiKeyId).toBe("key-id");
    expect(config.cdpApiKeySecret).toBe("key-secret");
  });
});
