import { Hono } from "hono";
import type { Config } from "../config.js";
import { createHelloRoute } from "./hello.js";
import { createMeterRoute } from "./meter.js";

// ★ CUSTOMIZE — Compose your paid business logic routes here.
// Each skill has its own module; this file is just the composition root.

export function createApiRoutes(config: Config) {
  const api = new Hono();
  api.route("/", createHelloRoute());
  api.route("/", createMeterRoute(config));
  return api;
}
