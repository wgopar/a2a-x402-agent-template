import { handle } from "hono/aws-lambda";
import type { LambdaEvent, LambdaContext } from "hono/aws-lambda";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";

type LambdaHandler = ReturnType<typeof handle>;

let initPromise: Promise<LambdaHandler>;

async function init(): Promise<LambdaHandler> {
  const config = await loadConfig();
  return handle(createApp(config));
}

export async function handler(event: LambdaEvent, context: LambdaContext) {
  initPromise ??= init();
  return (await initPromise)(event, context);
}
