import { AgentAnimations, Agents, createClippy, type ClippyAgent } from "../../src";

const ALL_TARGET = "all";
const agentNames = Object.values(Agents);

const targetSelect = requiredElement<HTMLSelectElement>("#target");
const animationSelect = requiredElement<HTMLSelectElement>("#animation");
const messageInput = requiredElement<HTMLInputElement>("#message");
const soundOverrideSelect = requiredElement<HTMLSelectElement>("#sound-override");
const soundTestSelect = requiredElement<HTMLSelectElement>("#sound-test");
const agentList = requiredElement<HTMLElement>("#agent-list");
const status = requiredElement<HTMLElement>("#status");
const demoSoundFormat = "mp3" as const;
const clippySounds = await fetch(`/agents/Clippy/sounds-${demoSoundFormat}.json`, {
  cache: "no-store"
}).then((response) => response.json() as Promise<Record<string, string>>);

status.textContent = `Sound format forced to ${demoSoundFormat.toUpperCase()}.`;

let agents = new Map<Agents, ClippyAgent>();

targetSelect.append(option("All agents", ALL_TARGET));
for (const agentName of agentNames) {
  targetSelect.append(option(agentName, agentName));
  const chip = document.createElement("button");
  chip.className = "agent-chip";
  chip.type = "button";
  chip.textContent = agentName;
  chip.addEventListener("click", () => {
    targetSelect.value = agentName;
  });
  agentList.append(chip);
}

soundOverrideSelect.append(option("Original sound 10", ""));
for (const id of Object.keys(clippySounds).sort((a, b) => Number(a) - Number(b))) {
  soundOverrideSelect.append(option(`Use sound ${id}`, id));
  soundTestSelect.append(option(`Clippy sound ${id}`, id));
}
soundTestSelect.value = "10";

for (const animationName of Object.values(AgentAnimations)) {
  animationSelect.append(option(animationName, animationName));
}
animationSelect.value = AgentAnimations.GetAttention;

await loadAgents();

async function loadAgents(): Promise<void> {
  for (const agent of agents.values()) {
    agent.destroy();
  }

  const overrideId = soundOverrideSelect.value;
  const overrideSound = overrideId ? clippySounds[overrideId] : undefined;
  const soundMap = overrideSound ? { "10": overrideSound } : undefined;
  const agentEntries = await Promise.all(
    agentNames.map(async (agentName, index) => {
      const columns = Math.min(5, agentNames.length);
      const spacingX = 160;
      const spacingY = 130;
      const options = {
        agent: agentName,
        assetsBaseUrl: "/agents/",
        soundFormat: demoSoundFormat,
        initialPosition: {
          x: 80 + (index % columns) * spacingX,
          y: 260 + Math.floor(index / columns) * spacingY
        },
        ...(agentName === Agents.Clippy && soundMap ? { soundMap } : {})
      };
      const agent = await createClippy(options);

      agent.element.addEventListener("clippy:sound-error", (event) => {
        console.warn(`${agentName} sound failed`, (event as CustomEvent).detail);
      });
      agent.show(true);
      return [agentName, agent] as const;
    })
  );

  agents = new Map<Agents, ClippyAgent>(agentEntries);
  status.textContent = overrideId
    ? `Sound format ${demoSoundFormat.toUpperCase()}; Clippy sound 10 remapped to ${overrideId}.`
    : `Sound format ${demoSoundFormat.toUpperCase()}; Clippy sound 10 is original.`;
}

document.querySelector("#speak")?.addEventListener("click", () => {
  for (const agent of selectedAgents()) {
    agent.speak(messageInput.value);
  }
});

document.querySelector("#animate")?.addEventListener("click", () => {
  const animation = animationSelect.value;
  for (const agent of selectedAgents()) {
    agent.play(animation) || agent.animate();
  }
});

document.querySelector("#random")?.addEventListener("click", () => {
  for (const agent of selectedAgents()) {
    agent.animate();
  }
});

document.querySelector("#scatter")?.addEventListener("click", () => {
  selectedAgents().forEach((agent, index) => {
    agent.moveTo(70 + index * 90, 520 + (index % 2) * 80);
  });
});

document.querySelector("#stop")?.addEventListener("click", () => {
  for (const agent of selectedAgents()) {
    agent.stop();
  }
});

document.querySelector("#reload")?.addEventListener("click", () => {
  void loadAgents();
});

document.querySelector("#play-sound")?.addEventListener("click", () => {
  void playClippySound(soundTestSelect.value);
});

function selectedAgents(): ClippyAgent[] {
  if (targetSelect.value === ALL_TARGET) {
    return [...agents.values()];
  }

  const agent = agents.get(targetSelect.value as Agents);
  return agent ? [agent] : [];
}

function option(label: string, value: string): HTMLOptionElement {
  const element = document.createElement("option");
  element.value = value;
  element.textContent = label;
  return element;
}

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Demo control ${selector} is missing from the page.`);
  return element;
}

async function playClippySound(id: string): Promise<void> {
  const source = clippySounds[id];
  if (!source) throw new Error(`Clippy sound ${id} is missing.`);

  const audio = new Audio(source);
  audio.volume = 1;
  await audio.play();
  status.textContent = `Played Clippy sound ${id} from ${demoSoundFormat.toUpperCase()} map.`;
}
