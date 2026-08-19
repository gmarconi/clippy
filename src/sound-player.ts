type SoundPlayDetail = {
  animation: string | undefined;
  sound: string;
  sourceLength: number;
  backend: "web-audio" | "html-audio";
};

type SoundErrorDetail = SoundPlayDetail & {
  error: unknown;
};

type BrowserWindowWithWebkitAudio = Window & {
  webkitAudioContext?: typeof AudioContext;
};

let sharedAudioContext: AudioContext | undefined;
let unlockListenersInstalled = false;

export class SoundPlayer {
  #root: HTMLElement;
  #sources: Record<string, string>;
  #buffers = new Map<string, Promise<AudioBuffer>>();
  #fallbackAudio: Record<string, HTMLAudioElement>;

  constructor(root: HTMLElement, sources: Record<string, string>) {
    this.#root = root;
    this.#sources = sources;
    this.#fallbackAudio = Object.fromEntries(
      Object.entries(sources).map(([key, value]) => {
        const audio = new Audio(value);
        audio.preload = "auto";
        audio.load();
        return [key, audio];
      })
    );

    installUnlockListeners();
    for (const key of Object.keys(sources)) {
      void this.#decode(key);
    }
  }

  play(sound: string, animation: string | undefined): void {
    const source = this.#sources[sound];
    if (!source) return;

    const context = getAudioContext();
    if (!context) {
      this.#playWithHtmlAudio(sound, animation);
      return;
    }

    void context
      .resume()
      .then(() => this.#decode(sound))
      .then((buffer) => {
        const node = context.createBufferSource();
        const gain = context.createGain();
        node.buffer = buffer;
        gain.gain.value = 1;
        node.connect(gain);
        gain.connect(context.destination);

        this.#dispatchPlay({
          animation,
          backend: "web-audio",
          sound,
          sourceLength: source.length
        });
        node.start(context.currentTime + 0.01);
      })
      .catch((error: unknown) => {
        this.#dispatchError({
          animation,
          backend: "web-audio",
          error,
          sound,
          sourceLength: source.length
        });
        this.#playWithHtmlAudio(sound, animation);
      });
  }

  #decode(sound: string): Promise<AudioBuffer> {
    const existing = this.#buffers.get(sound);
    if (existing) return existing;

    const source = this.#sources[sound];
    if (!source) return Promise.reject(new Error(`Sound ${sound} is missing.`));

    const context = getAudioContext();
    if (!context) return Promise.reject(new Error("Web Audio is not available."));

    const promise = dataUriToArrayBuffer(source).then((buffer) => context.decodeAudioData(buffer));
    this.#buffers.set(sound, promise);
    return promise;
  }

  #playWithHtmlAudio(sound: string, animation: string | undefined): void {
    const audio = this.#fallbackAudio[sound];
    if (!audio) return;

    const player = audio.cloneNode(true);
    if (!(player instanceof HTMLAudioElement)) return;

    player.currentTime = 0;
    this.#dispatchPlay({
      animation,
      backend: "html-audio",
      sound,
      sourceLength: audio.src.length
    });
    void player.play().catch((error: unknown) => {
      this.#dispatchError({
        animation,
        backend: "html-audio",
        error,
        sound,
        sourceLength: audio.src.length
      });
    });
  }

  #dispatchPlay(detail: SoundPlayDetail): void {
    this.#root.dispatchEvent(new CustomEvent("clippy:sound-play", { detail }));
  }

  #dispatchError(detail: SoundErrorDetail): void {
    this.#root.dispatchEvent(new CustomEvent("clippy:sound-error", { detail }));
  }
}

function getAudioContext(): AudioContext | undefined {
  if (sharedAudioContext) return sharedAudioContext;

  const AudioContextConstructor =
    window.AudioContext ?? (window as BrowserWindowWithWebkitAudio).webkitAudioContext;
  if (!AudioContextConstructor) return undefined;

  sharedAudioContext = new AudioContextConstructor();
  return sharedAudioContext;
}

function installUnlockListeners(): void {
  if (unlockListenersInstalled) return;
  unlockListenersInstalled = true;

  const unlock = () => {
    const context = getAudioContext();
    if (!context) return;
    void context.resume().then(() => {
      const buffer = context.createBuffer(1, 1, context.sampleRate);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      source.start();
    });
  };

  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("keydown", unlock, { passive: true });
  window.addEventListener("touchstart", unlock, { passive: true });
}

async function dataUriToArrayBuffer(dataUri: string): Promise<ArrayBuffer> {
  const response = await fetch(dataUri);
  return response.arrayBuffer();
}
