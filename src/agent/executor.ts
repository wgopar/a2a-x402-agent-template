import { v4 as uuidv4 } from "uuid";
import type { Task, TaskStatusUpdateEvent } from "@a2a-js/sdk";
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
    const task: Task = {
      kind: "task",
      id: requestContext.taskId,
      contextId: requestContext.contextId,
      status: {
        state: "completed",
        message: {
          kind: "message",
          messageId: uuidv4(),
          role: "agent",
          parts: [{ kind: "text", text: "Hello, World!" }],
          contextId: requestContext.contextId,
        },
        timestamp: new Date().toISOString(),
      },
    };

    eventBus.publish(task);

    const statusEvent: TaskStatusUpdateEvent = {
      kind: "status-update",
      taskId: requestContext.taskId,
      contextId: requestContext.contextId,
      status: task.status,
      final: true,
    };

    eventBus.publish(statusEvent);
    eventBus.finished();
  }

  async cancelTask(
    _taskId: string,
    eventBus: ExecutionEventBus,
  ): Promise<void> {
    eventBus.finished();
  }
}
