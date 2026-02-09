import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("Lambda entrypoint", () => {
  const original = { ...process.env };

  beforeEach(() => {
    process.env.WALLET_ADDRESS = "0xtest";
    process.env.PRIVATE_KEY = "0xkey";
  });

  afterEach(() => {
    process.env = { ...original };
  });

  it("exports a handler function", async () => {
    const lambda = await import("../src/lambda.js");
    expect(typeof lambda.handler).toBe("function");
  });
});
