import { BalloonPosition } from "./enums";
import type { BalloonAction, BalloonPlacement, SpeakOptions } from "./types";

export interface BalloonOptions {
  position?: BalloonPlacement;
  offset?: {
    x?: number;
    y?: number;
  };
}

const defaultOffset = {
  x: 10,
  y: 10
};

export class Balloon {
  #element: HTMLElement;
  #text: HTMLElement;
  #actions: HTMLElement;
  #timer: number | undefined;
  #position: BalloonPlacement;
  #offset: { x: number; y: number };

  constructor(parent: HTMLElement, options: BalloonOptions = {}) {
    this.#element = document.createElement("div");
    this.#element.className = "clippy-balloon";
    this.#element.hidden = true;
    this.#position = options.position ?? BalloonPosition.Left;
    this.#offset = {
      x: options.offset?.x ?? defaultOffset.x,
      y: options.offset?.y ?? defaultOffset.y
    };
    this.#applyPosition();

    this.#text = document.createElement("div");
    this.#text.className = "clippy-balloon-text";
    this.#element.appendChild(this.#text);

    this.#actions = document.createElement("div");
    this.#actions.className = "clippy-balloon-actions";
    this.#element.appendChild(this.#actions);

    parent.appendChild(this.#element);
  }

  speak(text: string, options: SpeakOptions = {}): Promise<void> {
    this.close();
    if (options.balloonPosition || options.balloonOffset) {
      this.setPosition(options.balloonPosition ?? this.#position, options.balloonOffset);
    }
    this.#text.textContent = text;
    this.#renderActions(options.actions ?? []);
    this.#element.hidden = false;

    const hold = options.hold ?? (options.actions?.length ? 10000 : Math.max(2000, Math.min(10000, text.length * 55)));
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

  setPosition(position: BalloonPlacement, offset?: { x?: number; y?: number }): void {
    this.#position = position;
    this.#offset = {
      x: offset?.x ?? this.#offset.x,
      y: offset?.y ?? this.#offset.y
    };
    this.#applyPosition();
  }

  destroy(): void {
    this.close();
    this.#element.remove();
  }

  #applyPosition(): void {
    this.#element.dataset.position = this.#position;
    this.#element.style.setProperty("--clippy-balloon-offset-x", `${this.#offset.x}px`);
    this.#element.style.setProperty("--clippy-balloon-offset-y", `${this.#offset.y}px`);
  }

  #renderActions(actions: BalloonAction[]): void {
    this.#actions.replaceChildren();
    this.#actions.hidden = actions.length === 0;

    for (const action of actions) {
      const button = document.createElement("button");
      button.className = "clippy-balloon-action";
      button.type = "button";
      button.textContent = action.label;
      if (action.id) button.dataset.action = action.id;
      button.addEventListener("click", (event) => {
        action.onClick?.(action, event);
        this.#element.dispatchEvent(
          new CustomEvent("clippy:balloon-action", {
            bubbles: true,
            detail: {
              action
            }
          })
        );
      });
      this.#actions.appendChild(button);
    }
  }
}
