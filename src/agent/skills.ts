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
];
