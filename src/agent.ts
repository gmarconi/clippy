import { AgentAnimations, Agents } from "./enums";
import { Animator, AnimatorState } from "./animator";
import { Balloon } from "./balloon";
import { TaskQueue } from "./queue";
import type { AgentName, AnimationName, CreateClippyOptions, MoveOptions, SpeakOptions } from "./types";
import { delay } from "./utils";

const IDLE_PREFIX = "Idle";

export class ClippyAgent {
  readonly name: AgentName;
  readonly element: HTMLElement;

  #animator: Animator;
  #balloon: Balloon;
  #queue: TaskQueue;
  #hidden = true;
  #destroyed = false;
  #stopOnNewAction: boolean;
  #draggable: boolean;
  #movementVersion = 0;
  #dragState:
    | {
        pointerId: number;
        startX: number;
        startY: number;
        left: number;
        top: number;
      }
    | undefined;

  constructor(name: AgentName, animator: Animator, options: CreateClippyOptions) {
    this.name = name;
    this.#animator = animator;
    this.element = animator.root;
    this.#balloon = new Balloon(this.element);
    this.#queue = new TaskQueue(() => this.#onQueueEmpty());
    this.#stopOnNewAction = options.stopOnNewAction ?? true;
    this.#draggable = options.draggable ?? true;

    this.element.className = ["clippy", options.className].filter(Boolean).join(" ");
    this.element.dataset.agent = String(name);
    if (options.id) this.element.id = options.id;
    if (this.#draggable) this.#setupDrag();
    this.hide(true);
  }

  show(fast = false): void {
    this.#assertAlive();
    this.#hidden = false;
    this.element.hidden = false;
    this.#animator.resume();

    if (fast || !this.hasAnimation(AgentAnimations.Show)) {
      this.#onQueueEmpty();
      return;
    }

    this.play(AgentAnimations.Show, { timeout: 1500 });
  }

  hide(fast = false): void {
    this.#assertAlive();
    this.#hidden = true;
    this.stop();

    if (fast || !this.hasAnimation(AgentAnimations.Hide)) {
      this.element.hidden = true;
      this.#animator.pause();
      return;
    }

    this.#queue.add(
      () =>
        new Promise<void>((resolve) => {
          this.#animator.showAnimation(AgentAnimations.Hide, (_, state) => {
            if (state === AnimatorState.Exited) {
              this.element.hidden = true;
              this.#animator.pause();
              resolve();
            }
          });
        })
    );
  }

  play(animation: AnimationName, options: { timeout?: number } = {}): boolean {
    this.#assertAlive();
    if (!this.hasAnimation(animation)) return false;
    this.#prepareForAction();

    const timeout = options.timeout ?? 5000;
    this.#queue.add(
      () =>
        new Promise<void>((resolve) => {
          let completed = false;
          let timer: number | undefined;

          if (timeout > 0) {
            timer = window.setTimeout(() => {
              if (!completed) this.#animator.exitAnimation();
            }, timeout);
          }

          this.#animator.showAnimation(animation, (_, state) => {
            if (state !== AnimatorState.Exited) return;
            completed = true;
            if (timer) window.clearTimeout(timer);
            resolve();
          });
        })
    );

    return true;
  }

  animate(): boolean {
    const candidates = this.animations().filter((name) => !name.startsWith(IDLE_PREFIX));
    const animation = candidates[Math.floor(Math.random() * candidates.length)];
    return animation ? this.play(animation) : false;
  }

  speak(text: string, options?: SpeakOptions): void {
    this.#assertAlive();
    this.#prepareForAction();
    this.#queue.add(() => this.#balloon.speak(text, options));
  }

  closeBalloon(): void {
    this.#balloon.close();
  }

  delay(ms = 250): void {
    this.#prepareForAction();
    this.#queue.add(async () => {
      this.#onQueueEmpty();
      await delay(ms);
    });
  }

  moveTo(x: number, y: number, options: MoveOptions = {}): void {
    this.#assertAlive();
    this.#prepareForAction();
    const duration = options.duration ?? 1000;
    const direction = this.#getDirection(x, y);
    const animation = `Move${direction}`;

    this.#queue.add(async () => {
      if (duration === 0 || !this.hasAnimation(animation)) {
        await this.#moveElementTo(x, y, duration);
        return;
      }

      await new Promise<void>((resolve) => {
        this.#animator.showAnimation(animation, async (_, state) => {
          if (state === AnimatorState.Waiting) {
            await this.#moveElementTo(x, y, duration);
            this.#animator.exitAnimation();
          }
          if (state === AnimatorState.Exited) resolve();
        });
      });
    });
  }

  gestureAt(x: number, y: number): boolean {
    this.#assertAlive();
    const direction = this.#getDirection(x, y);
    const gesture = `Gesture${direction}`;
    const look = `Look${direction}`;
    return this.play(this.hasAnimation(gesture) ? gesture : look);
  }

  stopCurrent(): void {
    this.#animator.exitAnimation();
    this.#balloon.close();
  }

  stop(): void {
    this.#movementVersion += 1;
    this.#queue.clear();
    this.#animator.stop();
    this.#balloon.hide();
  }

  hasAnimation(name: AnimationName): boolean {
    return this.#animator.hasAnimation(name);
  }

  animations(): string[] {
    return this.#animator.animations();
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.stop();
    this.#animator.destroy();
    this.#balloon.destroy();
    this.#teardownDrag();
    this.element.remove();
    this.#destroyed = true;
  }

  #prepareForAction(): void {
    if (!this.#stopOnNewAction) return;
    this.#movementVersion += 1;
    this.#queue.interrupt();
    this.#animator.stop();
    this.#balloon.close();
  }

  #setupDrag(): void {
    this.element.addEventListener("pointerdown", this.#onPointerDown);
    this.element.addEventListener("pointermove", this.#onPointerMove);
    this.element.addEventListener("pointerup", this.#onPointerUp);
    this.element.addEventListener("pointercancel", this.#onPointerUp);
  }

  #teardownDrag(): void {
    this.element.removeEventListener("pointerdown", this.#onPointerDown);
    this.element.removeEventListener("pointermove", this.#onPointerMove);
    this.element.removeEventListener("pointerup", this.#onPointerUp);
    this.element.removeEventListener("pointercancel", this.#onPointerUp);
  }

  #onPointerDown = (event: PointerEvent): void => {
    if (!this.#draggable || event.button !== 0 || this.#destroyed) return;
    const target = event.target;
    if (target instanceof HTMLElement && target.closest(".clippy-balloon")) return;
    this.#prepareForAction();

    this.#dragState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: this.element.offsetLeft,
      top: this.element.offsetTop
    };
    this.element.setPointerCapture(event.pointerId);
    this.element.classList.add("clippy-dragging");
    event.preventDefault();
  };

  #onPointerMove = (event: PointerEvent): void => {
    const state = this.#dragState;
    if (!state || state.pointerId !== event.pointerId) return;

    this.element.style.left = `${state.left + event.clientX - state.startX}px`;
    this.element.style.top = `${state.top + event.clientY - state.startY}px`;
  };

  #onPointerUp = (event: PointerEvent): void => {
    const state = this.#dragState;
    if (!state || state.pointerId !== event.pointerId) return;

    this.#dragState = undefined;
    this.element.classList.remove("clippy-dragging");
    if (this.element.hasPointerCapture(event.pointerId)) {
      this.element.releasePointerCapture(event.pointerId);
    }
  };

  #onQueueEmpty(): void {
    if (this.#hidden || this.#destroyed) return;
    const idleAnimations = this.animations().filter((name) => name.startsWith(IDLE_PREFIX));
    const rest = this.hasAnimation(AgentAnimations.RestPose) ? AgentAnimations.RestPose : idleAnimations[0];
    if (rest) {
      this.#animator.showAnimation(rest);
    }
  }

  #getDirection(x: number, y: number): string {
    const rect = this.element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const horizontal = x < centerX ? "Left" : "Right";
    const vertical = y < centerY ? "Up" : "Down";
    const dx = Math.abs(centerX - x);
    const dy = Math.abs(centerY - y);

    if (dx / dy > 2) return horizontal;
    if (dy / dx > 2) return vertical;
    return `${vertical}${horizontal}`;
  }

  #moveElementTo(x: number, y: number, duration: number): Promise<void> {
    if (duration <= 0) {
      this.element.style.left = `${x}px`;
      this.element.style.top = `${y}px`;
      return Promise.resolve();
    }

    const startLeft = this.element.offsetLeft;
    const startTop = this.element.offsetTop;
    const start = performance.now();
    const movementVersion = this.#movementVersion;

    return new Promise((resolve) => {
      const tick = (now: number) => {
        if (movementVersion !== this.#movementVersion) {
          resolve();
          return;
        }

        const progress = Math.min((now - start) / duration, 1);
        this.element.style.left = `${startLeft + (x - startLeft) * progress}px`;
        this.element.style.top = `${startTop + (y - startTop) * progress}px`;
        if (progress < 1) {
          window.requestAnimationFrame(tick);
        } else {
          resolve();
        }
      };
      window.requestAnimationFrame(tick);
    });
  }

  #assertAlive(): void {
    if (this.#destroyed) {
      throw new Error(`Agent ${String(this.name)} has been destroyed.`);
    }
  }
}

export function defaultInitialPosition(): { x: number; y: number } {
  return {
    x: Math.round(window.innerWidth * 0.8),
    y: Math.round(window.innerHeight * 0.75 + window.scrollY)
  };
}

export const DefaultAgent = Agents.Clippy;
