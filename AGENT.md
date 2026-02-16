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
2. x402 payment middleware scoped to `/api/*` and selectively to `/a2a`
3. Route handlers: health, A2A JSON-RPC, paid API routes

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

The middleware peeks at `c.req.json().method` to decide. Hono caches the parsed body, so reading it twice is safe.

## Customization

Three files to modify — everything else is framework plumbing:

### `src/agent/skills.ts`

Define skill metadata that appears in the agent card. Each skill needs `id`, `name`, `description`, `tags`, and `examples`.

### `src/agent/executor.ts`

Implement the `AgentExecutor` interface. The `execute` method receives a `RequestContext` (with the user's message and contextId) and an `ExecutionEventBus` (to publish response messages). Call `eventBus.finished()` when done.

### `src/routes/api.ts`

Add Hono route handlers. All routes registered here are automatically mounted under `/api` and payment-gated. To change pricing, edit the `routes` array in `src/app.ts`.

### What NOT to touch

- `src/app.ts` — Only modify if changing middleware chain or pricing
- `src/a2a/handler.ts` — A2A protocol plumbing, rarely needs changes
- `src/payments/x402.ts` — Payment middleware factory, change only for custom payment schemes
- `src/config.ts` — Add new env vars here if your agent needs them

## Key Patterns

### Factory Functions

The codebase uses factory functions that accept `Config`:
- `createApp(config)` — builds the full Hono app
- `createPaymentMiddleware(config, routes)` — builds x402 middleware
- `buildAgentCard(config, skills)` — builds the A2A agent card
- `createA2ARoutes(agentCard, executor)` — builds A2A JSON-RPC routes

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
| `@a2a-js/sdk` v0.3.x | `DefaultRequestHandler.getAgentCard()` is **async** — always `await` it |
| `agent0-sdk` v1.5.x | `createAgent(name, desc)` is **sync** but `agentId` is a getter that may return `undefined` before registration |
| `agent0-sdk` | Does NOT have built-in registry addresses for Base chains — must provide via `registryOverrides` |
| `agent0-sdk` | `registerIPFS()` → `waitMined()` does a two-step flow; `setAgentURI` may revert on Base Sepolia |

## Testing Conventions

- Test runner: **Vitest** (config in `vitest.config.ts` or inline in `package.json`)
- Test directory: `test/`
- Naming: `*.test.ts`
- Tests mock `Config` objects directly — no `.env` loading in tests
- Agent card tests verify skill metadata propagation
- Executor tests verify the `EventBus` publish/finished flow
- App tests verify middleware ordering and route composition

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
