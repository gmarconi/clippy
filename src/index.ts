import { Animator } from "./animator";
import { ClippyAgent, DefaultAgent, defaultInitialPosition } from "./agent";
import { defaultAssetLoader } from "./loader";
import type { AssetLoader, CreateClippyOptions } from "./types";
import { isBrowser } from "./utils";

export { ClippyAgent } from "./agent";
export { AgentAnimations, AgentIntents, Agents, BalloonPosition } from "./enums";
export { bundledAgentIntentMap } from "./intents";
export type {
  AgentData,
  AgentIntentMap,
  AgentIntentName,
  AgentName,
  Animation,
  AnimationName,
  BalloonAction,
  BalloonPlacement,
  AssetLoader,
  Branch,
  CreateClippyOptions,
  Frame,
  MoveOptions,
  PerformOptions,
  SoundFormat,
  SpeakOptions
} from "./types";

export async function createClippy(
  options: CreateClippyOptions,
  loader: AssetLoader = defaultAssetLoader
): Promise<ClippyAgent> {
  if (!isBrowser()) {
    throw new Error("createClippy requires a browser DOM.");
  }

  const agent = options.agent ?? DefaultAgent;
  const container = options.container ?? document.body;
  const [data, spriteUrl, loadedSounds] = await Promise.all([
    loader.loadAgentData(agent, options.assetsBaseUrl),
    loader.loadSprite(agent, options.assetsBaseUrl),
    options.sounds === false
      ? Promise.resolve({})
      : loader.loadSounds(agent, options.assetsBaseUrl, options.soundFormat)
  ]);
  const sounds = { ...loadedSounds, ...options.soundMap };

  const root = document.createElement("div");
  const position = options.initialPosition ?? defaultInitialPosition();
  root.style.left = `${position.x}px`;
  root.style.top = `${position.y}px`;
  container.appendChild(root);

  const animator = new Animator(root, data, spriteUrl, sounds);
  return new ClippyAgent(agent, animator, options);
}
