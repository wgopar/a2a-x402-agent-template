import { v4 as uuidv4 } from "uuid";
import type { Message } from "@a2a-js/sdk";
import type {
  AgentExecutor,
  RequestContext,
  ExecutionEventBus,
} from "@a2a-js/sdk/server";

// ★ CUSTOMIZE — Implement your agent's task execution logic here
export class HelloExecutor implements AgentExecutor {
  async execute(
    requestContext: RequestContext,
    eventBus: ExecutionEventBus,
  ): Promise<void> {
    const response: Message = {
      kind: "message",
      messageId: uuidv4(),
      role: "agent",
      parts: [{ kind: "text", text: "Hello, World!" }],
      contextId: requestContext.contextId,
    };

    eventBus.publish(response);
    eventBus.finished();
  }

  async cancelTask(
    _taskId: string,
    eventBus: ExecutionEventBus,
  ): Promise<void> {
    eventBus.finished();
  }
}
