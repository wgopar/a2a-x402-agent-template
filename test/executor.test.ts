import { describe, it, expect, vi } from "vitest";
import { HelloExecutor } from "../src/agent/executor.js";
import type { RequestContext, ExecutionEventBus } from "@a2a-js/sdk/server";
import type { Task, TaskStatusUpdateEvent } from "@a2a-js/sdk";

describe("HelloExecutor", () => {
  function mockEventBus() {
    return {
      publish: vi.fn(),
      finished: vi.fn(),
      on: vi.fn().mockReturnThis(),
      off: vi.fn().mockReturnThis(),
      once: vi.fn().mockReturnThis(),
      removeAllListeners: vi.fn().mockReturnThis(),
    } satisfies ExecutionEventBus;
  }

  function mockRequestContext(): RequestContext {
    return {
      userMessage: {
        kind: "message",
        messageId: "test-msg",
        role: "user",
        parts: [{ kind: "text", text: "hello" }],
        contextId: "ctx-1",
      },
      taskId: "task-1",
      contextId: "ctx-1",
    } as RequestContext;
  }

  it("publishes Task and TaskStatusUpdateEvent", async () => {
    const executor = new HelloExecutor();
    const eventBus = mockEventBus();
    const ctx = mockRequestContext();

    await executor.execute(ctx, eventBus);

    expect(eventBus.publish).toHaveBeenCalledTimes(2);

    const task = eventBus.publish.mock.calls[0][0] as Task;
    expect(task.kind).toBe("task");
    expect(task.id).toBe("task-1");
    expect(task.status.state).toBe("completed");
    expect(task.status.message?.parts[0]).toEqual({ kind: "text", text: "Hello, World!" });

    const statusEvent = eventBus.publish.mock.calls[1][0] as TaskStatusUpdateEvent;
    expect(statusEvent.kind).toBe("status-update");
    expect(statusEvent.final).toBe(true);
    expect(statusEvent.taskId).toBe("task-1");
  });

  it("calls finished after publishing", async () => {
    const executor = new HelloExecutor();
    const eventBus = mockEventBus();

    await executor.execute(mockRequestContext(), eventBus);

    expect(eventBus.finished).toHaveBeenCalledTimes(1);
  });

  it("cancelTask calls finished", async () => {
    const executor = new HelloExecutor();
    const eventBus = mockEventBus();

    await executor.cancelTask("task-1", eventBus);

    expect(eventBus.finished).toHaveBeenCalledTimes(1);
  });
});
