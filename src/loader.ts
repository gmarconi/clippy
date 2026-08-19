import type { AgentData, AgentName, AssetLoader, SoundFormat } from "./types";
import { joinUrl } from "./utils";

const dataCache = new Map<string, Promise<AgentData>>();
const spriteCache = new Map<string, Promise<string>>();
const soundCache = new Map<string, Promise<Record<string, string>>>();

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

async function loadImage(url: string): Promise<string> {
  await new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`Failed to load ${url}`));
    image.src = url;
  });
  return url;
}

function cacheKey(agent: AgentName, baseUrl: string, suffix: string): string {
  return `${baseUrl}|${agent}|${suffix}`;
}

function preferredSoundFormat(format: SoundFormat = "auto"): "mp3" | "ogg" | undefined {
  if (format === "mp3" || format === "ogg") return format;

  const audio = document.createElement("audio");
  if (audio.canPlayType?.('audio/ogg; codecs="vorbis"')) return "ogg";
  if (audio.canPlayType?.("audio/mpeg")) return "mp3";
  return undefined;
}

export const defaultAssetLoader: AssetLoader = {
  loadAgentData(agent, baseUrl) {
    const key = cacheKey(agent, baseUrl, "agent");
    let promise = dataCache.get(key);
    if (!promise) {
      promise = fetchJson<AgentData>(joinUrl(baseUrl, String(agent), "agent.json"));
      dataCache.set(key, promise);
    }
    return promise;
  },

  loadSprite(agent, baseUrl) {
    const key = cacheKey(agent, baseUrl, "map");
    let promise = spriteCache.get(key);
    if (!promise) {
      promise = loadImage(joinUrl(baseUrl, String(agent), "map.png"));
      spriteCache.set(key, promise);
    }
    return promise;
  },

  async loadSounds(agent, baseUrl, requestedFormat = "auto") {
    const format = preferredSoundFormat(requestedFormat);
    if (!format) return {};

    const key = cacheKey(agent, baseUrl, `sounds-${format}`);
    let promise = soundCache.get(key);
    if (!promise) {
      promise = fetchJson<Record<string, string>>(
        joinUrl(baseUrl, String(agent), `sounds-${format}.json`)
      ).catch(() => ({}));
      soundCache.set(key, promise);
    }
    return promise;
  }
};
