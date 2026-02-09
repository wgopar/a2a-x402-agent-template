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

export function createA2ARoutes(agentCard: AgentCard, executor: AgentExecutor) {
  const taskStore = new InMemoryTaskStore();
  const requestHandler = new DefaultRequestHandler(
    agentCard,
    taskStore,
    executor,
  );
  const jsonRpcHandler = new JsonRpcTransportHandler(requestHandler);

  const a2a = new Hono();

  // Agent card discovery
  a2a.get("/.well-known/agent-card.json", async (c) => {
    const card = await requestHandler.getAgentCard();
    return c.json(card);
  });

  // A2A JSON-RPC endpoint
  a2a.post("/a2a", async (c) => {
    const body = await c.req.json();
    const context = new ServerCallContext([], new UnauthenticatedUser());
    const result = await jsonRpcHandler.handle(body, context);

    // handle() may return an AsyncGenerator for streaming — we don't support
    // streaming in Lambda, so treat non-generator results as single responses
    if (result && typeof result === "object" && Symbol.asyncIterator in result) {
      // Consume the first value from the generator for non-streaming response
      const iterator = result as AsyncGenerator;
      const first = await iterator.next();
      return c.json(first.value);
    }

    return c.json(result);
  });

  return a2a;
}
