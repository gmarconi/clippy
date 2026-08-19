import type { Agents } from "./enums";

export type AgentName = Agents | `${Agents}` | (string & {});
export type AnimationName = string;
export type SoundFormat = "auto" | "mp3" | "ogg";

export interface Branch {
  frameIndex: number;
  weight: number;
}

export interface Frame {
  duration: number;
  images?: Array<[number, number]>;
  sound?: string;
  exitBranch?: number;
  branching?: {
    branches: Branch[];
  };
}

export interface Animation {
  frames: Frame[];
  useExitBranching?: boolean;
}

export interface AgentData {
  overlayCount: number;
  sounds: string[];
  framesize: [number, number];
  animations: Record<string, Animation>;
}

export interface AssetLoader {
  loadAgentData(agent: AgentName, baseUrl: string): Promise<AgentData>;
  loadSprite(agent: AgentName, baseUrl: string): Promise<string>;
  loadSounds(agent: AgentName, baseUrl: string, format?: SoundFormat): Promise<Record<string, string>>;
}

export interface CreateClippyOptions {
  agent?: AgentName;
  assetsBaseUrl: string;
  container?: HTMLElement;
  id?: string;
  sounds?: boolean;
  soundFormat?: SoundFormat;
  soundMap?: Record<string, string>;
  stopOnNewAction?: boolean;
  draggable?: boolean;
  className?: string;
  initialPosition?: {
    x: number;
    y: number;
  };
}

export interface MoveOptions {
  duration?: number;
}

export interface SpeakOptions {
  hold?: number;
}
