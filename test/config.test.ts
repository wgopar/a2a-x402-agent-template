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

  it("loads required env vars", () => {
    const config = loadConfig();
    expect(config.walletAddress).toBe("0x1234567890abcdef");
    expect(config.privateKey).toBe("0xdeadbeef");
  });

  it("applies defaults for optional vars", () => {
    const config = loadConfig();
    expect(config.network).toBe("eip155:84532");
    expect(config.port).toBe(3000);
    expect(config.agentName).toBe("Hello Agent");
  });

  it("throws on missing WALLET_ADDRESS", () => {
    delete process.env.WALLET_ADDRESS;
    expect(() => loadConfig()).toThrow("WALLET_ADDRESS");
  });

  it("throws on missing PRIVATE_KEY", () => {
    delete process.env.PRIVATE_KEY;
    expect(() => loadConfig()).toThrow("PRIVATE_KEY");
  });
});
