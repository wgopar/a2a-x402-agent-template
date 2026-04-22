import { Hono } from "hono";
import { cors } from "hono/cors";
import { health } from "./routes/health.js";
import { createApiRoutes } from "./routes/api.js";
import { createPaymentMiddleware } from "./payments/x402.js";
import { createA2ARoutes } from "./a2a/handler.js";
import { buildAgentCard } from "./agent/card.js";
import { skills } from "./agent/skills.js";
import { SkillExecutor } from "./agent/executor.js";
import { createMiddleware } from "hono/factory";
import type { Config } from "./config.js";

const PAID_A2A_METHODS = new Set(["message/send", "message/stream"]);
const FREE_PATHS = new Set(["/api/health"]);

function jsonRpcError(id: string | number | null, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

async function parseA2AJsonBody(c: {
  req: { header: (name: string) => string | undefined; text: () => Promise<string> };
  set: (key: string, value: unknown) => void;
}): Promise<Record<string, unknown> | { error: ReturnType<typeof jsonRpcError>; status: number }> {
  const contentType = c.req.header("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return { error: jsonRpcError(null, -32600, "Content-Type must be application/json"), status: 415 };
  }

  try {
    const text = await c.req.text();
    const body = JSON.parse(text) as Record<string, unknown>;
    c.set("jsonrpcBody", body);
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

  // A2A middleware: pre-parse JSON-RPC body and gate paid methods
  app.use(
    "/a2a",
    createMiddleware(async (c, next) => {
      const result = await parseA2AJsonBody(c);
      if ("error" in result) {
        return c.json(result.error, result.status as 400);
      }

      if (payment && PAID_A2A_METHODS.has(result.method as string)) {
        return payment(c, next);
      }
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

  return app;
}
