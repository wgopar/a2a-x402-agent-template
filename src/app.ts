import { Hono } from "hono";
import { cors } from "hono/cors";
import { health } from "./routes/health.js";
import { api } from "./routes/api.js";
import { createPaymentMiddleware } from "./payments/x402.js";
import { createA2ARoutes } from "./a2a/handler.js";
import { buildAgentCard } from "./agent/card.js";
import { skills } from "./agent/skills.js";
import { HelloExecutor } from "./agent/executor.js";
import type { Config } from "./config.js";

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

  const agentCard = buildAgentCard(config, skills);
  const executor = new HelloExecutor();
  app.route("/", createA2ARoutes(agentCard, executor));

  app.use(
    "/api/*",
    createPaymentMiddleware(config, [
      {
        path: "GET /api/hello",
        price: "$0.01",
        description: "Hello World greeting",
      },
    ]),
  );
  app.route("/api", api);

  return app;
}
