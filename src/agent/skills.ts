import type { AgentSkill } from "@a2a-js/sdk";

// ★ CUSTOMIZE — Define your agent's skills here
export const skills: AgentSkill[] = [
  {
    id: "hello",
    name: "Hello",
    description: "Returns a greeting for $0.01 USDC via x402",
    tags: ["greeting", "x402"],
    examples: ["Say hello", "Greet me"],
  },
];
