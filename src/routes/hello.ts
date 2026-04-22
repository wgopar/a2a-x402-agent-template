import { Hono } from "hono";
import { z } from "zod";
import { runHello } from "../work/hello.js";

const helloInputSchema = z.object({
  name: z.string().optional(),
});

export function createHelloRoute() {
  const route = new Hono();

  route.get("/hello", (c) => {
    return c.json(runHello());
  });

  route.post("/hello", async (c) => {
    const raw = await c.req.json().catch(() => ({}));
    const parsed = helloInputSchema.safeParse(raw);
    if (!parsed.success) {
      return c.json({ error: "Invalid input", details: parsed.error.issues }, 400);
    }
    return c.json(runHello(parsed.data.name));
  });

  return route;
}
