import { v4 as uuidv4 } from "uuid";
import type { Task, TaskStatusUpdateEvent, TaskStatus } from "@a2a-js/sdk";
import type {
  AgentExecutor,
  RequestContext,
  ExecutionEventBus,
} from "@a2a-js/sdk/server";
import { runHello } from "../work/hello.js";
import { runMeter } from "../work/meter.js";

// ★ CUSTOMIZE — Dispatch incoming A2A messages to your skill's work function.
//
// Message convention: first text part is `"<skillId> [args...]"`, e.g.
//   "hello"                → runHello()
//   "hello Alice"          → runHello("Alice")
//   "meter hello world"    → runMeter("hello world")
// Unknown skills → task.status.state = "failed".

export class SkillExecutor implements AgentExecutor {
  async execute(
    requestContext: RequestContext,
    eventBus: ExecutionEventBus,
  ): Promise<void> {
    const status = this.dispatch(requestContext);
    const task: Task = {
      kind: "task",
      id: requestContext.taskId,
      contextId: requestContext.contextId,
      status,
    };
    eventBus.publish(task);

    const statusEvent: TaskStatusUpdateEvent = {
      kind: "status-update",
      taskId: requestContext.taskId,
      contextId: requestContext.contextId,
      status,
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

  private dispatch(ctx: RequestContext): TaskStatus {
    const timestamp = new Date().toISOString();
    const text = this.firstText(ctx);
    if (!text) {
      return this.failed(ctx, timestamp, "no text content in message");
    }

    const [skillId, ...argTokens] = text.trim().split(/\s+/);
    const args = argTokens.join(" ");

    switch (skillId) {
      case "hello": {
        const { message } = runHello(args || undefined);
        return this.completed(ctx, timestamp, message);
      }
      case "meter": {
        if (!args) return this.failed(ctx, timestamp, "meter requires a message argument");
        const result = runMeter(args);
        return this.completed(
          ctx,
          timestamp,
          JSON.stringify({
            output: result.output,
            bytesProcessed: result.bytesProcessed,
            chargedUnits: result.chargedUnits.toString(),
          }),
        );
      }
      default:
        return this.failed(ctx, timestamp, `unknown skill: ${skillId}`);
    }
  }

  private firstText(ctx: RequestContext): string | undefined {
    const part = ctx.userMessage?.parts?.[0];
    return part && part.kind === "text" ? part.text : undefined;
  }

  private completed(ctx: RequestContext, timestamp: string, text: string): TaskStatus {
    return {
      state: "completed",
      message: {
        kind: "message",
        messageId: uuidv4(),
        role: "agent",
        parts: [{ kind: "text", text }],
        contextId: ctx.contextId,
      },
      timestamp,
    };
  }

  private failed(ctx: RequestContext, timestamp: string, reason: string): TaskStatus {
    return {
      state: "failed",
      message: {
        kind: "message",
        messageId: uuidv4(),
        role: "agent",
        parts: [{ kind: "text", text: reason }],
        contextId: ctx.contextId,
      },
      timestamp,
    };
  }
}
