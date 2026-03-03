# Agent Guide

Instructions for AI coding agents working on this codebase.

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start local dev server (port 3000, hot reload) |
| `npm test` | Run vitest test suite |
| `npm run build` | Compile TypeScript |
| `npm run lint` | Typecheck (`tsc --noEmit`) |
| `npm run deploy` | Build Docker image, push to ECR, terraform apply |
| `npm run create-wallet -- <name>` | Generate wallet + set `function_name` → `.env` + `terraform.tfvars` |
| `npm run register` | Register ERC-8004 on-chain identity |
| `npm run build:lambda` | Build Lambda Docker image locally |

## Architecture

### Composition Root

`src/app.ts` is the composition root. It assembles the full Hono app:

1. CORS middleware (allows `X-Payment` / `X-Payment-Response` headers)
2. x402 payment middleware scoped to `/api/*` and selectively to `/a2a` — **nullable** when `bypassPayments` is enabled
3. A2A middleware pre-parses JSON-RPC body (`parseA2AJsonBody`), stores it in Hono context (`c.set("jsonrpcBody", body)`) to avoid double-parsing
4. `FREE_PATHS` set exempts specific paths (like `/api/health`) from payment even when payments are enabled
5. Route handlers: health, A2A JSON-RPC, paid API routes

**Key:** Middleware registration order matters in Hono. Payment middleware must be registered before route handlers.

### Two Entrypoints

- `src/server.ts` — Node.js server for local development. Uses `@hono/node-server`.
- `src/lambda.ts` — AWS Lambda handler. Uses `hono/aws-lambda` adapter with a lazy init pattern (`??=`) that caches the handler promise for concurrency-safe cold starts.

Both call `createApp(config)` from `app.ts` — the app itself is runtime-agnostic.

### Config Loading

`src/config.ts` exports `loadConfig()` which is **async**:
- Locally: reads from `.env` via `dotenv`
- On Lambda: fetches private key from AWS Secrets Manager via `PRIVATE_KEY_SECRET_ARN`
- `@aws-sdk/client-secrets-manager` is dynamically imported (not bundled — marked `--external:@aws-sdk/*` in esbuild)

### A2A Payment Gating

Not all A2A methods require payment. The `PAID_A2A_METHODS` set in `app.ts` controls which JSON-RPC methods are gated:

- **Paid:** `message/send`, `message/stream` (work-producing)
- **Free:** `tasks/get`, `tasks/cancel`, push notification config (read-only)

The middleware pre-parses the JSON-RPC body and stores it via `c.set("jsonrpcBody", body)`. The A2A handler reads it back via `c.get("jsonrpcBody")`. This avoids double-parsing and enables proper JSON-RPC error codes (`-32700` parse error, `-32600` invalid request, `-32603` internal error).

## Customization

Four files to modify — everything else is framework plumbing:

### `src/agent/skills.ts`

Define skill metadata that appears in the agent card. Each skill needs `id`, `name`, `description`, `tags`, and `examples`.

### `src/agent/entrypoints.ts`

Define structured entrypoints — machine-readable catalog of what the agent can do. Each entrypoint specifies `id`, HTTP `method`, `url`, `description`, optional `inputSchema` (JSON Schema), and `pricing`. These are merged into the agent card at `/.well-known/agent-card.json`.

### `src/agent/executor.ts`

Implement the `AgentExecutor` interface. The `execute` method receives a `RequestContext` and an `ExecutionEventBus`. Publish a `Task` (kind: "task") followed by a `TaskStatusUpdateEvent` (kind: "status-update", final: true), then call `eventBus.finished()`.

### `src/routes/api.ts`

Add Hono route handlers. All routes registered here are automatically mounted under `/api` and payment-gated. Uses Zod for input validation — see the `POST /hello` route for the pattern. To change pricing, edit the `routes` array in `src/app.ts`.

### What NOT to touch

- `src/app.ts` — Only modify if changing middleware chain, pricing, or `FREE_PATHS`
- `src/a2a/handler.ts` — A2A protocol plumbing + `agent-registration.json` endpoint, rarely needs changes
- `src/payments/x402.ts` — CDP facilitator middleware factory, change only for custom payment schemes
- `src/config.ts` — Add new env vars here if your agent needs them

## Key Patterns

### Factory Functions

The codebase uses factory functions that accept `Config`:
- `createApp(config)` — builds the full Hono app
- `createPaymentMiddleware(config, routes)` — builds x402 middleware (returns null when `bypassPayments`)
- `buildAgentCard(config, skills)` — builds the A2A agent card
- `createA2ARoutes(agentCard, executor, config)` — builds A2A JSON-RPC routes (includes `A2ARoutesConfig` with `agentId`, `network`, `walletAddress`)
- `buildEntrypoints(baseUrl)` — builds structured entrypoints array

### Lazy Lambda Init

```typescript
let initPromise: Promise<LambdaHandler>;
export async function handler(event, context) {
  initPromise ??= init();  // only runs once
  return (await initPromise)(event, context);
}
```

The `??=` operator ensures `init()` runs exactly once, even under concurrent cold-start invocations.

### Agent Card Provider Fields

`provider` in the agent card requires BOTH `AGENT_PROVIDER_NAME` and `AGENT_PROVIDER_URL` to be set. If only one is set, the provider field is omitted.

## SDK Gotchas

| SDK | Gotcha |
|-----|--------|
| `@x402/hono` v2.3.x | `Network` type is `` `${string}:${string}` `` — must be a colon-separated string like `eip155:84532` |
| `@coinbase/x402` v2.1.x | `createFacilitatorConfig(keyId, keySecret)` returns `FacilitatorConfig` — pass to `new HTTPFacilitatorClient(config)` |
| `@a2a-js/sdk` v0.3.x | `DefaultRequestHandler.getAgentCard()` is **async** — always `await` it |
| `@a2a-js/sdk` | `eventBus.publish()` accepts `Task \| TaskStatusUpdateEvent \| Message \| TaskArtifactUpdateEvent` — use discriminated `kind` field |
| `agent0-sdk` v1.5.x | `createAgent(name, desc)` is **sync** but `agentId` is a getter that may return `undefined` before registration |
| `agent0-sdk` | Does NOT have built-in registry addresses for Base chains — must provide via `registryOverrides` |
| `agent0-sdk` | `registerIPFS()` → `waitMined()` does a two-step flow; `setAgentURI` may revert on Base Sepolia |
| `erc-8004-js` v2.x | `IdentityClient` requires a `BlockchainAdapter` (use `ViemAdapter`) — not the same as `agent0-sdk`'s SDK class |

## Testing Conventions

- Test runner: **Vitest** (config in `vitest.config.ts` or inline in `package.json`)
- Test directory: `test/`
- Naming: `*.test.ts`
- Tests mock `Config` objects directly — no `.env` loading in tests (use `bypassPayments: true` in test configs)
- Agent card tests verify skill metadata propagation
- Executor tests verify the Task + TaskStatusUpdateEvent publish/finished flow (2 publish calls)
- App tests verify middleware ordering, route composition, JSON-RPC error codes, and Zod validation
- Config tests verify `bypassPayments` production safety check and new fields (`agentId`, `cdpApiKeyId`, etc.)

Run a single test file:
```bash
npx vitest run test/app.test.ts
```

## Infrastructure

### Docker Multi-Stage Build

```dockerfile
# Builder → esbuild CJS bundle (single file, ~470KB)
# Lambda target (default) → AWS Lambda Node.js 22 base image
# Server target → Node.js slim for ECS/standalone
```

Build targets:
- `docker build .` or `docker build --target lambda .` — Lambda
- `docker build --target server .` — Standalone Node.js server

### esbuild Bundle

Lambda uses a CJS bundle (not ESM) for compatibility with the Lambda runtime. `@aws-sdk/*` packages are externalized (provided by the Lambda runtime).

### Terraform Resources

All AWS resources are named using `var.function_name` (required, no default). The `create-wallet` script sets this automatically. Each agent deployment must use a unique name to avoid resource collisions.

The `infra/` directory manages:
- ECR repository
- Lambda function (container image)
- IAM role + policies (including Secrets Manager access)
- Function URL (public HTTPS, no API Gateway)
- Secrets Manager secret (private key)
- CloudWatch log group

### Deploy Script (`scripts/deploy.sh`)

1. Reads ECR URL from terraform output
2. Authenticates Docker with ECR
3. Builds Lambda Docker image with timestamp tag
4. Pushes to ECR
5. Runs `terraform apply` with the new image tag
6. Prints terraform outputs (including Function URL)
