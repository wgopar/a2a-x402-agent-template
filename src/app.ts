import { Hono } from "hono";
import { cors } from "hono/cors";
import { health } from "./routes/health.js";
import { createApiRoutes } from "./routes/api.js";
import { createPaymentMiddleware } from "./payments/x402.js";
import { createA2ARoutes } from "./a2a/handler.js";
import { createMCPRoutes } from "./mcp/handler.js";
import { buildAgentCard } from "./agent/card.js";
import { skills } from "./agent/skills.js";
import { SkillExecutor } from "./agent/executor.js";
import { createMiddleware } from "hono/factory";
import type { Config } from "./config.js";

const PAID_A2A_METHODS = new Set(["message/send", "message/stream"]);
const PAID_MCP_TOOLS = new Set(["hello", "meter"]);
const FREE_PATHS = new Set(["/api/health"]);

function jsonRpcError(id: string | number | null, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

interface JsonRpcBody {
  method?: string;
  params?: unknown;
  id?: string | number | null;
}

async function parseJsonRpcBody(
  c: {
    req: { header: (name: string) => string | undefined; text: () => Promise<string> };
    set: (key: string, value: unknown) => void;
  },
  stashKey: string,
): Promise<JsonRpcBody | { error: ReturnType<typeof jsonRpcError>; status: number }> {
  const contentType = c.req.header("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return { error: jsonRpcError(null, -32600, "Content-Type must be application/json"), status: 415 };
  }

  try {
    const text = await c.req.text();
    const body = JSON.parse(text) as JsonRpcBody;
    c.set(stashKey, body);
    return body;
  } catch {
    return { error: jsonRpcError(null, -32700, "Parse error"), status: 400 };
  }
}

export function createApp(config: Config) {
  const app = new Hono();

  app.use(
    cors({
      origin: "*",
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type", "X-Payment", "X-Payment-Response"],
      exposeHeaders: ["X-Payment-Response"],
    }),
  );

  app.route("/", health);

  // HTTP + A2A route payment config (keyed by HTTP method + path).
  const payment = config.bypassPayments
    ? null
    : createPaymentMiddleware(config, [
        {
          path: "GET /api/hello",
          price: "$0.01",
          description: "Hello World greeting",
        },
        {
          path: "POST /a2a",
          price: "$0.01",
          description: "A2A task execution",
        },
        {
          path: "POST /api/meter",
          scheme: "upto",
          price: config.meterMaxPricePerRequest,
          description: "Metered compute demo — priced via x402 upto",
        },
      ]);

  // Per-tool payment middleware for MCP. Same HTTP path (POST /mcp), different
  // schemes/prices, so we need separate middleware instances and dispatch
  // based on the peeked tool name.
  const mcpHelloPayment = config.bypassPayments
    ? null
    : createPaymentMiddleware(config, [
        { path: "POST /mcp", price: "$0.01", description: "MCP tool: hello (exact)" },
      ]);

  const mcpMeterPayment = config.bypassPayments
    ? null
    : createPaymentMiddleware(config, [
        {
          path: "POST /mcp",
          scheme: "upto",
          price: config.meterMaxPricePerRequest,
          description: "MCP tool: meter (upto)",
        },
      ]);

  // A2A middleware: pre-parse JSON-RPC body and gate paid methods
  app.use(
    "/a2a",
    createMiddleware(async (c, next) => {
      const result = await parseJsonRpcBody(c, "jsonrpcBody");
      if ("error" in result) {
        return c.json(result.error, result.status as 400);
      }

      if (payment && PAID_A2A_METHODS.has(result.method as string)) {
        return payment(c, next);
      }
      await next();
    }),
  );

  // MCP middleware: pre-parse JSON-RPC body (stash as parsedBody for the
  // transport) and gate paid tools/call by name.
  app.use(
    "/mcp",
    createMiddleware(async (c, next) => {
      if (c.req.method !== "POST") return next();
      const result = await parseJsonRpcBody(c, "parsedBody");
      if ("error" in result) {
        return c.json(result.error, result.status as 400);
      }
      if (result.method !== "tools/call") return next();
      const toolName = (result.params as { name?: string } | undefined)?.name;
      if (!toolName || !PAID_MCP_TOOLS.has(toolName)) return next();
      if (toolName === "hello" && mcpHelloPayment) return mcpHelloPayment(c, next);
      if (toolName === "meter" && mcpMeterPayment) return mcpMeterPayment(c, next);
      await next();
    }),
  );

  // API middleware: gate paid routes (skip free paths)
  if (payment) {
    app.use(
      "/api/*",
      createMiddleware(async (c, next) => {
        if (FREE_PATHS.has(c.req.path)) {
          await next();
          return;
        }
        return payment(c, next);
      }),
    );
  }

  const agentCard = buildAgentCard(config, skills);
  const executor = new SkillExecutor();
  app.route(
    "/",
    createA2ARoutes(agentCard, executor, {
      agentId: config.agentId,
      network: config.network,
      walletAddress: config.walletAddress,
    }),
  );
  app.route("/api", createApiRoutes(config));
  app.route("/", createMCPRoutes(config));

  return app;
}
