import { describe, it, expect } from "vitest";
import { buildAgentCard } from "../src/agent/card.js";
import { skills } from "../src/agent/skills.js";
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

describe("buildAgentCard", () => {
  it("returns a valid agent card", () => {
    const card = buildAgentCard(testConfig, skills);
    expect(card.name).toBe("Test Agent");
    expect(card.description).toBe("A test agent");
    expect(card.url).toBe("http://localhost:3000/a2a");
    expect(card.protocolVersion).toBe("0.3.0");
  });

  it("includes skills", () => {
    const card = buildAgentCard(testConfig, skills);
    expect(card.skills).toHaveLength(1);
    expect(card.skills[0].id).toBe("hello");
  });

  it("disables streaming for Lambda compatibility", () => {
    const card = buildAgentCard(testConfig, skills);
    expect(card.capabilities.streaming).toBe(false);
  });

  it("declares x402 extension", () => {
    const card = buildAgentCard(testConfig, skills);
    const ext = card.capabilities.extensions?.[0];
    expect(ext?.uri).toContain("a2a-x402");
    expect(ext?.required).toBe(true);
  });
});
