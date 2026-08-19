import type { AgentData, Animation, AnimationName, Frame } from "./types";
import { SoundPlayer } from "./sound-player";

export enum AnimatorState {
  Exited = "exited",
  Waiting = "waiting"
}

type StateCallback = (animation: AnimationName, state: AnimatorState) => void;
type Bounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export class Animator {
  readonly root: HTMLElement;
  readonly width: number;
  readonly height: number;

  #data: AgentData;
  #spriteUrl: string;
  #soundPlayer: SoundPlayer;
  #overlays: HTMLElement[] = [];
  #spriteContext: CanvasRenderingContext2D | undefined;
  #boundsCache = new Map<string, Bounds | undefined>();
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
    this.#soundPlayer = new SoundPlayer(root, sounds);
    this.#setVisibleBounds({ left: 0, top: 0, right: this.width, bottom: this.height });
    this.#setupOverlays();
    this.#loadSpriteImage();
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
    const bounds: Bounds[] = [];
    this.#overlays.forEach((overlay, index) => {
      const coordinates = images[index];
      if (!coordinates) {
        overlay.style.display = "none";
        return;
      }

      overlay.style.backgroundPosition = `${-coordinates[0]}px ${-coordinates[1]}px`;
      overlay.style.display = "block";
      const overlayBounds = this.#boundsForCoordinates(coordinates);
      if (overlayBounds) bounds.push(overlayBounds);
    });
    this.#setVisibleBounds(this.#unionBounds(bounds));
  }

  #loadSpriteImage(): void {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;

      context.drawImage(image, 0, 0);
      this.#spriteContext = context;
      this.#boundsCache.clear();
      this.#draw();
    };
    image.onerror = () => {
      this.#spriteContext = undefined;
    };
    image.src = this.#spriteUrl;
  }

  #boundsForCoordinates(coordinates: [number, number]): Bounds | undefined {
    const context = this.#spriteContext;
    if (!context) return undefined;

    const key = `${coordinates[0]},${coordinates[1]}`;
    if (this.#boundsCache.has(key)) return this.#boundsCache.get(key);

    try {
      const data = context.getImageData(coordinates[0], coordinates[1], this.width, this.height).data;
      let left = this.width;
      let top = this.height;
      let right = 0;
      let bottom = 0;

      for (let y = 0; y < this.height; y += 1) {
        for (let x = 0; x < this.width; x += 1) {
          const alpha = data[(y * this.width + x) * 4 + 3];
          if (alpha === 0) continue;
          left = Math.min(left, x);
          top = Math.min(top, y);
          right = Math.max(right, x + 1);
          bottom = Math.max(bottom, y + 1);
        }
      }

      const bounds = right > left && bottom > top ? { left, top, right, bottom } : undefined;
      this.#boundsCache.set(key, bounds);
      return bounds;
    } catch {
      this.#spriteContext = undefined;
      this.#boundsCache.clear();
      return undefined;
    }
  }

  #unionBounds(bounds: Bounds[]): Bounds {
    if (bounds.length === 0) {
      return { left: 0, top: 0, right: this.width, bottom: this.height };
    }

    return bounds.reduce(
      (union, current) => ({
        left: Math.min(union.left, current.left),
        top: Math.min(union.top, current.top),
        right: Math.max(union.right, current.right),
        bottom: Math.max(union.bottom, current.bottom)
      }),
      bounds[0] ?? { left: 0, top: 0, right: this.width, bottom: this.height }
    );
  }

  #setVisibleBounds(bounds: Bounds): void {
    this.root.style.setProperty("--clippy-visible-left", `${bounds.left}px`);
    this.root.style.setProperty("--clippy-visible-top", `${bounds.top}px`);
    this.root.style.setProperty("--clippy-visible-right", `${bounds.right}px`);
    this.root.style.setProperty("--clippy-visible-bottom", `${bounds.bottom}px`);
    this.root.style.setProperty("--clippy-visible-width", `${bounds.right - bounds.left}px`);
    this.root.style.setProperty("--clippy-visible-height", `${bounds.bottom - bounds.top}px`);
    this.root.style.setProperty("--clippy-visible-center-x", `${bounds.left + (bounds.right - bounds.left) / 2}px`);
    this.root.style.setProperty("--clippy-visible-center-y", `${bounds.top + (bounds.bottom - bounds.top) / 2}px`);
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
    this.#soundPlayer.play(sound, this.#currentAnimationName);
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
