import { Hono } from "hono";
import type { AgentCard } from "@a2a-js/sdk";
import {
  DefaultRequestHandler,
  InMemoryTaskStore,
  JsonRpcTransportHandler,
  ServerCallContext,
  UnauthenticatedUser,
} from "@a2a-js/sdk/server";
import type { AgentExecutor } from "@a2a-js/sdk/server";
import { buildEntrypoints } from "../agent/entrypoints.js";

export interface A2ARoutesConfig {
  agentId?: number;
  network: string;
  walletAddress: string;
}

function jsonRpcError(id: string | number | null, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function parseJsonRpcRequest(c: { get: (key: string) => unknown; req: { json: () => Promise<unknown> } }) {
  const preParsed = c.get("jsonrpcBody");
  if (preParsed) return preParsed as Record<string, unknown>;
  return c.req.json();
}

export function createA2ARoutes(
  agentCard: AgentCard,
  executor: AgentExecutor,
  config: A2ARoutesConfig,
) {
  const taskStore = new InMemoryTaskStore();
  const requestHandler = new DefaultRequestHandler(
    agentCard,
    taskStore,
    executor,
  );
  const jsonRpcHandler = new JsonRpcTransportHandler(requestHandler);

  const a2a = new Hono();

  // Agent card discovery — merged with structured entrypoints
  a2a.get("/.well-known/agent-card.json", async (c) => {
    const card = await requestHandler.getAgentCard();
    const entrypoints = buildEntrypoints(card.url.replace(/\/a2a$/, ""));
    return c.json({ ...card, entrypoints });
  });

  // Agent registration linkage — on-chain identity discovery
  a2a.get("/.well-known/agent-registration.json", (c) => {
    return c.json({
      agentId: config.agentId ?? null,
      network: config.network,
      walletAddress: config.walletAddress,
    });
  });

  // A2A JSON-RPC endpoint
  a2a.post("/a2a", async (c) => {
    let body: Record<string, unknown>;
    try {
      body = (await parseJsonRpcRequest(c)) as Record<string, unknown>;
    } catch {
      return c.json(jsonRpcError(null, -32700, "Parse error"));
    }

    const context = new ServerCallContext([], new UnauthenticatedUser());

    try {
      const result = await jsonRpcHandler.handle(body, context);

      // handle() may return an AsyncGenerator for streaming — we don't support
      // streaming in Lambda, so treat non-generator results as single responses
      if (result && typeof result === "object" && Symbol.asyncIterator in result) {
        const iterator = result as AsyncGenerator;
        const first = await iterator.next();
        return c.json(first.value);
      }

      return c.json(result);
    } catch (err) {
      const id = typeof body.id === "string" || typeof body.id === "number" ? body.id : null;
      console.error("A2A handler error:", err);
      return c.json(jsonRpcError(id, -32603, "Internal error"));
    }
  });

  return a2a;
}
