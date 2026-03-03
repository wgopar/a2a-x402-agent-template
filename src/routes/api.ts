import { Hono } from "hono";
import { z } from "zod";

// ★ CUSTOMIZE — Add your paid business logic routes here
const api = new Hono();

const helloInputSchema = z.object({
  name: z.string().optional(),
});

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

export { api };
