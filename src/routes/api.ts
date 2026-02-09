import { Hono } from "hono";

// ★ CUSTOMIZE — Add your paid business logic routes here
const api = new Hono();

api.get("/hello", (c) => {
  return c.json({ message: "Hello, World!" });
});

export { api };
