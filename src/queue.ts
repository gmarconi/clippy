export type QueueTask = () => Promise<void> | void;

export class TaskQueue {
  #items: QueueTask[] = [];
  #active = false;
  #onEmpty: () => void;
  #version = 0;

  constructor(onEmpty: () => void) {
    this.#onEmpty = onEmpty;
  }

  add(task: QueueTask): void {
    this.#items.push(task);
    void this.#drain(this.#version);
  }

  clear(): void {
    this.#items = [];
  }

  interrupt(): void {
    this.#version += 1;
    this.#items = [];
    this.#active = false;
  }

  async #drain(version: number): Promise<void> {
    if (this.#active) return;
    this.#active = true;

    while (version === this.#version && this.#items.length > 0) {
      const task = this.#items.shift();
      if (!task) continue;
      await task();
    }

    if (version !== this.#version) return;
    this.#active = false;
    this.#onEmpty();
  }
}
