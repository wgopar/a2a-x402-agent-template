import { describe, it, expect } from "vitest";
import { runHello } from "../src/work/hello.js";
import { runMeter, PRICE_PER_BYTE_USDC_UNITS } from "../src/work/meter.js";

describe("runHello", () => {
  it("defaults to World", () => {
    expect(runHello().message).toBe("Hello, World!");
  });

  it("uses given name", () => {
    expect(runHello("Alice").message).toBe("Hello, Alice!");
  });
});

describe("runMeter", () => {
  it("hashes and counts utf8 bytes", () => {
    const r = runMeter("hello world");
    expect(r.output).toBe(
      "sha256:b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
    );
    expect(r.bytesProcessed).toBe(11);
    expect(r.chargedUnits).toBe(110n);
  });

  it("measures multi-byte utf8 correctly", () => {
    // "héllo" — 5 chars, 6 utf8 bytes (é is two bytes)
    const r = runMeter("héllo");
    expect(r.bytesProcessed).toBe(6);
    expect(r.chargedUnits).toBe(60n);
  });

  it("uses the exported price constant", () => {
    expect(PRICE_PER_BYTE_USDC_UNITS).toBe(10n);
  });
});
