import type { AgentIntents, Agents, BalloonPosition } from "./enums";

export type AgentName = Agents | `${Agents}` | (string & {});
export type AgentIntentName = AgentIntents | `${AgentIntents}`;
export type BalloonPlacement = BalloonPosition | `${BalloonPosition}`;
export type AnimationName = string;
export type SoundFormat = "auto" | "mp3" | "ogg";
export type AgentIntentMap = Partial<Record<string, AnimationName>>;

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
  assetsBaseUrl?: string;
  container?: HTMLElement;
  id?: string;
  sounds?: boolean;
  soundFormat?: SoundFormat;
  soundMap?: Record<string, string>;
  intentMap?: AgentIntentMap;
  stopOnNewAction?: boolean;
  draggable?: boolean;
  balloonPosition?: BalloonPlacement;
  balloonOffset?: {
    x?: number;
    y?: number;
  };
  className?: string;
  initialPosition?: {
    x: number;
    y: number;
  };
}

export interface MoveOptions {
  duration?: number;
}

export interface PerformOptions {
  timeout?: number;
}

export interface BalloonAction {
  id?: string;
  label: string;
  onClick?: (action: BalloonAction, event: MouseEvent) => void;
}

export interface SpeakOptions {
  hold?: number;
  actions?: BalloonAction[];
  balloonPosition?: BalloonPlacement;
  balloonOffset?: {
    x?: number;
    y?: number;
  };
}
