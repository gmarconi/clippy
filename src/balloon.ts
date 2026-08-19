import type { SpeakOptions } from "./types";

export class Balloon {
  #element: HTMLElement;
  #text: HTMLElement;
  #timer: number | undefined;

  constructor(parent: HTMLElement) {
    this.#element = document.createElement("div");
    this.#element.className = "clippy-balloon";
    this.#element.hidden = true;

    this.#text = document.createElement("div");
    this.#text.className = "clippy-balloon-text";
    this.#element.appendChild(this.#text);
    parent.appendChild(this.#element);
  }

  speak(text: string, options: SpeakOptions = {}): Promise<void> {
    this.close();
    this.#text.textContent = text;
    this.#element.hidden = false;

    const hold = options.hold ?? Math.max(2000, Math.min(10000, text.length * 55));
    return new Promise((resolve) => {
      this.#timer = window.setTimeout(() => {
        this.hide();
        resolve();
      }, hold);
    });
  }

  close(): void {
    if (this.#timer) window.clearTimeout(this.#timer);
    this.#timer = undefined;
    this.hide();
  }

  hide(): void {
    this.#element.hidden = true;
  }

  destroy(): void {
    this.close();
    this.#element.remove();
  }
}
