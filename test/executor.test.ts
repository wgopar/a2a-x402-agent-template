import { describe, it, expect, vi } from "vitest";
import { SkillExecutor } from "../src/agent/executor.js";
import type { RequestContext, ExecutionEventBus } from "@a2a-js/sdk/server";
import type { Task, TaskStatusUpdateEvent } from "@a2a-js/sdk";

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

function mockRequestContext(text: string): RequestContext {
  return {
    userMessage: {
      kind: "message",
      messageId: "test-msg",
      role: "user",
      parts: [{ kind: "text", text }],
      contextId: "ctx-1",
    },
    taskId: "task-1",
    contextId: "ctx-1",
  } as RequestContext;
}

function getPublishedTask(bus: ReturnType<typeof mockEventBus>): Task {
  return bus.publish.mock.calls[0][0] as Task;
}

describe("SkillExecutor", () => {
  it("dispatches 'hello' to runHello with default greeting", async () => {
    const executor = new SkillExecutor();
    const bus = mockEventBus();
    await executor.execute(mockRequestContext("hello"), bus);

    const task = getPublishedTask(bus);
    expect(task.status.state).toBe("completed");
    expect(task.status.message?.parts[0]).toEqual({ kind: "text", text: "Hello, World!" });
  });

  it("dispatches 'hello Alice' with the name argument", async () => {
    const executor = new SkillExecutor();
    const bus = mockEventBus();
    await executor.execute(mockRequestContext("hello Alice"), bus);

    const task = getPublishedTask(bus);
    expect(task.status.state).toBe("completed");
    expect(task.status.message?.parts[0]).toEqual({ kind: "text", text: "Hello, Alice!" });
  });

  it("dispatches 'meter hello world' to runMeter", async () => {
    const executor = new SkillExecutor();
    const bus = mockEventBus();
    await executor.execute(mockRequestContext("meter hello world"), bus);

    const task = getPublishedTask(bus);
    expect(task.status.state).toBe("completed");
    const part = task.status.message?.parts[0];
    expect(part?.kind).toBe("text");
    const payload = JSON.parse((part as { text: string }).text);
    expect(payload.output).toBe(
      "sha256:b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
    );
    expect(payload.bytesProcessed).toBe(11);
    expect(payload.chargedUnits).toBe("110");
  });

  it("fails when meter is called without an argument", async () => {
    const executor = new SkillExecutor();
    const bus = mockEventBus();
    await executor.execute(mockRequestContext("meter"), bus);

    const task = getPublishedTask(bus);
    expect(task.status.state).toBe("failed");
    expect((task.status.message?.parts[0] as { text: string }).text).toContain("meter requires");
  });

  it("fails for unknown skills", async () => {
    const executor = new SkillExecutor();
    const bus = mockEventBus();
    await executor.execute(mockRequestContext("nosuchskill"), bus);

    const task = getPublishedTask(bus);
    expect(task.status.state).toBe("failed");
    expect((task.status.message?.parts[0] as { text: string }).text).toContain("unknown skill");
  });

  it("publishes Task, status-update, and calls finished", async () => {
    const executor = new SkillExecutor();
    const bus = mockEventBus();
    await executor.execute(mockRequestContext("hello"), bus);

    expect(bus.publish).toHaveBeenCalledTimes(2);
    const statusEvent = bus.publish.mock.calls[1][0] as TaskStatusUpdateEvent;
    expect(statusEvent.kind).toBe("status-update");
    expect(statusEvent.final).toBe(true);
    expect(bus.finished).toHaveBeenCalledTimes(1);
  });

  it("cancelTask calls finished", async () => {
    const executor = new SkillExecutor();
    const bus = mockEventBus();
    await executor.cancelTask("task-1", bus);
    expect(bus.finished).toHaveBeenCalledTimes(1);
  });
});
