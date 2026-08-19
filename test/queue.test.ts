import { describe, expect, it } from "vitest";
import { TaskQueue } from "../src/queue";

describe("TaskQueue", () => {
  it("runs tasks in order", async () => {
    const events: number[] = [];
    const queue = new TaskQueue(() => events.push(4));

    queue.add(async () => {
      events.push(1);
    });
    queue.add(() => {
      events.push(2);
    });
    queue.add(() => {
      events.push(3);
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(events).toEqual([1, 2, 3, 4]);
  });

  it("interrupts queued work and starts new work", async () => {
    const events: string[] = [];
    const queue = new TaskQueue(() => events.push("empty"));

    queue.add(
      () =>
        new Promise<void>((resolve) => {
          events.push("first");
          setTimeout(resolve, 10);
        })
    );

    queue.interrupt();
    queue.add(() => {
      events.push("second");
    });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(events).toEqual(["first", "second", "empty"]);
  });
});
