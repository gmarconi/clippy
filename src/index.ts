import { Animator } from "./animator";
import { ClippyAgent, DefaultAgent, defaultInitialPosition } from "./agent";
import { defaultAssetLoader } from "./loader";
import type { AssetLoader, CreateClippyOptions } from "./types";
import { isBrowser } from "./utils";

const defaultAssetsBaseUrl = "/agents/";

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
  options: CreateClippyOptions = {},
  loader: AssetLoader = defaultAssetLoader
): Promise<ClippyAgent> {
  if (!isBrowser()) {
    throw new Error("createClippy requires a browser DOM.");
  }

  const agent = options.agent ?? DefaultAgent;
  const container = options.container ?? document.body;
  const assetsBaseUrl = options.assetsBaseUrl ?? defaultAssetsBaseUrl;
  const [data, spriteUrl, loadedSounds] = await Promise.all([
    loader.loadAgentData(agent, assetsBaseUrl),
    loader.loadSprite(agent, assetsBaseUrl),
    options.sounds === false
      ? Promise.resolve({})
      : loader.loadSounds(agent, assetsBaseUrl, options.soundFormat)
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
