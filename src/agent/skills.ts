import type { AgentSkill } from "@a2a-js/sdk";

// ★ CUSTOMIZE — Define your agent's skills here
export const skills: AgentSkill[] = [
  {
    id: "hello",
    name: "Hello",
    description:
      "A demo skill that returns a personalized greeting. Costs $0.01 USDC per request via the x402 payment protocol. Use this as a template for building paid agent skills.",
    tags: ["greeting", "x402", "demo", "template", "payment"],
    examples: [
      "Say hello",
      "Greet me",
      "Send a greeting to Alice",
      "Say hi in a friendly way",
      "Give me a welcome message",
    ],
  },
  {
    id: "meter",
    name: "Meter",
    description:
      "Metered compute demo priced via the x402 `upto` scheme. The client pre-authorizes a per-request ceiling (METER_MAX_PRICE_PER_REQUEST) and is charged proportional to actual work at settlement. Replace the work function in src/routes/meter.ts with your real paid logic (LLM call, compute job, data fetch, etc.).",
    tags: ["x402", "upto", "demo", "template", "metered"],
    examples: [
      "Process this text",
      "Hash this input",
      "Run the meter over a short message",
    ],
  },
];
