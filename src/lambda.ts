import { handle } from "hono/aws-lambda";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";

const config = loadConfig();
const app = createApp(config);

export const handler = handle(app);
