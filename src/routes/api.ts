import { Hono } from "hono";
import { z } from "zod";
import type { Config } from "../config.js";
import { createMeterRoute } from "./meter.js";

// ★ CUSTOMIZE — Add your paid business logic routes here

const helloInputSchema = z.object({
  name: z.string().optional(),
});

export function createApiRoutes(config: Config) {
  const api = new Hono();

  api.get("/hello", (c) => {
    return c.json({ message: "Hello, World!" });
  });

  api.post("/hello", async (c) => {
    const raw = await c.req.json().catch(() => ({}));
    const parsed = helloInputSchema.safeParse(raw);
    if (!parsed.success) {
      return c.json({ error: "Invalid input", details: parsed.error.issues }, 400);
    }
    const name = parsed.data.name ?? "World";
    return c.json({ message: `Hello, ${name}!` });
  });

  api.route("/", createMeterRoute(config));

  return api;
}
