import type { AgentData, Animation, AnimationName, Frame } from "./types";

export enum AnimatorState {
  Exited = "exited",
  Waiting = "waiting"
}

type StateCallback = (animation: AnimationName, state: AnimatorState) => void;

export class Animator {
  readonly root: HTMLElement;
  readonly width: number;
  readonly height: number;

  #data: AgentData;
  #spriteUrl: string;
  #sounds: Record<string, HTMLAudioElement>;
  #overlays: HTMLElement[] = [];
  #currentAnimation: Animation | undefined;
  #currentAnimationName: string | undefined;
  #currentFrame: Frame | undefined;
  #currentFrameIndex = 0;
  #exiting = false;
  #callback: StateCallback | undefined;
  #timer: number | undefined;

  constructor(root: HTMLElement, data: AgentData, spriteUrl: string, sounds: Record<string, string>) {
    this.root = root;
    this.#data = data;
    this.#spriteUrl = spriteUrl;
    this.width = data.framesize[0];
    this.height = data.framesize[1];
    this.#sounds = Object.fromEntries(
      Object.entries(sounds).map(([key, value]) => {
        const audio = new Audio(value);
        audio.preload = "auto";
        audio.load();
        return [key, audio];
      })
    );
    this.#setupOverlays();
  }

  animations(): string[] {
    return Object.keys(this.#data.animations);
  }

  hasAnimation(name: AnimationName): boolean {
    return Boolean(this.#data.animations[name]);
  }

  showAnimation(name: AnimationName, callback?: StateCallback): boolean {
    const animation = this.#data.animations[name];
    if (!animation) return false;

    this.#exiting = false;
    this.#currentAnimation = animation;
    this.#currentAnimationName = name;
    this.#currentFrame = undefined;
    this.#currentFrameIndex = 0;
    this.#callback = callback;
    this.resume();
    return true;
  }

  exitAnimation(): void {
    this.#exiting = true;
  }

  stop(): void {
    this.pause();
    this.#exiting = false;
    this.#currentAnimation = undefined;
    this.#currentAnimationName = undefined;
    this.#currentFrame = undefined;
    this.#callback = undefined;
  }

  pause(): void {
    if (this.#timer) window.clearTimeout(this.#timer);
    this.#timer = undefined;
  }

  resume(): void {
    this.pause();
    this.#step();
  }

  destroy(): void {
    this.stop();
    this.#overlays = [];
  }

  #setupOverlays(): void {
    this.#overlays = [this.root];
    let current = this.root;

    this.#setupOverlay(current);
    for (let i = 1; i < this.#data.overlayCount; i += 1) {
      const child = document.createElement("div");
      this.#setupOverlay(child);
      current.appendChild(child);
      this.#overlays.push(child);
      current = child;
    }
  }

  #setupOverlay(element: HTMLElement): void {
    element.style.width = `${this.width}px`;
    element.style.height = `${this.height}px`;
    element.style.backgroundImage = `url("${this.#spriteUrl}")`;
    element.style.backgroundRepeat = "no-repeat";
    element.style.display = "none";
  }

  #draw(): void {
    const images = this.#currentFrame?.images ?? [];
    this.#overlays.forEach((overlay, index) => {
      const coordinates = images[index];
      if (!coordinates) {
        overlay.style.display = "none";
        return;
      }

      overlay.style.backgroundPosition = `${-coordinates[0]}px ${-coordinates[1]}px`;
      overlay.style.display = "block";
    });
  }

  #nextFrameIndex(): number | undefined {
    if (!this.#currentAnimation) return undefined;
    if (!this.#currentFrame) return 0;

    if (this.#exiting && this.#currentFrame.exitBranch !== undefined) {
      return this.#currentFrame.exitBranch;
    }

    const branching = this.#currentFrame.branching;
    if (branching) {
      let random = Math.random() * 100;
      for (const branch of branching.branches) {
        if (random <= branch.weight) return branch.frameIndex;
        random -= branch.weight;
      }
    }

    return this.#currentFrameIndex + 1;
  }

  #isLastFrame(): boolean {
    if (!this.#currentAnimation) return true;
    return this.#currentFrameIndex >= this.#currentAnimation.frames.length - 1;
  }

  #playSound(): void {
    const sound = this.#currentFrame?.sound;
    if (!sound) return;
    const audio = this.#sounds[sound];
    if (!audio) return;

    const player = audio.cloneNode(true);
    if (!(player instanceof HTMLAudioElement)) return;

    player.currentTime = 0;
    void player.play().catch((error: unknown) => {
      this.root.dispatchEvent(
        new CustomEvent("clippy:sound-error", {
          detail: {
            sound,
            animation: this.#currentAnimationName,
            error
          }
        })
      );
    });
  }

  #step(): void {
    if (!this.#currentAnimation) return;

    const next = this.#nextFrameIndex();
    if (next === undefined) return;

    const nextIndex = Math.min(next, this.#currentAnimation.frames.length - 1);
    const frameChanged = !this.#currentFrame || this.#currentFrameIndex !== nextIndex;
    this.#currentFrameIndex = nextIndex;

    if (!(this.#isLastFrame() && this.#currentAnimation.useExitBranching)) {
      const frame = this.#currentAnimation.frames[this.#currentFrameIndex];
      if (!frame) return;
      this.#currentFrame = frame;
    }

    this.#draw();
    this.#playSound();

    const duration = this.#currentFrame?.duration ?? 100;
    this.#timer = window.setTimeout(() => this.#step(), duration);

    if (this.#callback && frameChanged && this.#isLastFrame()) {
      if (this.#currentAnimation.useExitBranching && !this.#exiting) {
        this.#callback(this.#currentAnimationName ?? "", AnimatorState.Waiting);
      } else {
        this.#callback(this.#currentAnimationName ?? "", AnimatorState.Exited);
      }
    }
  }
}
