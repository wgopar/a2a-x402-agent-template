# Agent Template

AI agent factory template: Hono + x402 payments + A2A protocol + ERC-8004 identity.

## Commands
- `npm run dev` — start local server (port 3000)
- `npm run build` — compile TypeScript
- `npm test` — run vitest
- `npm run lint` — typecheck (`tsc --noEmit`)
- `npm run register` — mint ERC-8004 identity on-chain

## Architecture
- `src/app.ts` — composition root (runtime-agnostic)
- `src/server.ts` / `src/lambda.ts` — thin entrypoints (Node.js / AWS Lambda)
- x402 middleware scoped to `/api/*`; A2A routes (`/.well-known/agent-card.json`, `/a2a`) are free

## Customization (3 files)
- `src/routes/api.ts` — paid HTTP endpoints
- `src/agent/executor.ts` — A2A task execution logic
- `src/agent/skills.ts` — skill metadata for AgentCard

## Key SDK Notes
- `@x402/hono` v2.3.x — `Network` type is `` `${string}:${string}` ``
- `@a2a-js/sdk` v0.3.x — `DefaultRequestHandler.getAgentCard()` is **async**
- `agent0-sdk` v1.5.x — `createAgent(name, desc)` is sync, `agentId` is a getter
- Lambda adapter is built into Hono: `import { handle } from "hono/aws-lambda"`
