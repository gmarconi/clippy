/// <reference types="vite/client" />

import {
  AgentAnimations,
  AgentIntents,
  Agents,
  BalloonPosition,
  createClippy,
  type ClippyAgent
} from "../../src";

const ALL_TARGET = "all";
const ASSETS_BASE_URL = `${import.meta.env.BASE_URL}agents/`;
const GRID_COLUMNS = 5;
const GRID_START_X = 80;
const GRID_START_Y = 500;
const GRID_SPACING_X = 230;
const GRID_SPACING_Y = 180;
const agentNames = Object.values(Agents);

const targetSelect = requiredElement<HTMLSelectElement>("#target");
const animationSelect = requiredElement<HTMLSelectElement>("#animation");
const intentSelect = requiredElement<HTMLSelectElement>("#intent");
const balloonPositionSelect = requiredElement<HTMLSelectElement>("#balloon-position");
const messageInput = requiredElement<HTMLInputElement>("#message");
const agentList = requiredElement<HTMLElement>("#agent-list");

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

for (const animationName of Object.values(AgentAnimations)) {
  animationSelect.append(option(animationName, animationName));
}
animationSelect.value = AgentAnimations.GetAttention;

for (const intent of Object.values(AgentIntents)) {
  intentSelect.append(option(intent, intent));
}
intentSelect.value = AgentIntents.Arrive;

for (const position of Object.values(BalloonPosition)) {
  balloonPositionSelect.append(option(position, position));
}
balloonPositionSelect.value = BalloonPosition.Left;

await loadAgents();

async function loadAgents(): Promise<void> {
  for (const agent of agents.values()) {
    agent.destroy();
  }

  const agentEntries = await Promise.all(
    agentNames.map(async (agentName, index) => {
      const options = {
        agent: agentName,
        assetsBaseUrl: ASSETS_BASE_URL,
        initialPosition: gridPosition(index)
      };
      const agent = await createClippy(options);

      agent.element.addEventListener("clippy:sound-error", (event) => {
        console.warn(`${agentName} sound failed`, (event as CustomEvent).detail);
      });
      agent.element.addEventListener("clippy:balloon-action", (event) => {
        const detail = (event as CustomEvent<{ action: { id?: string } }>).detail;
        if (detail.action.id === "arrive") {
          agent.perform(AgentIntents.Arrive);
        }
        if (detail.action.id === "go-away") {
          agent.perform(AgentIntents.GoAway);
        }
      });
      agent.show(true);
      return [agentName, agent] as const;
    })
  );

  agents = new Map<Agents, ClippyAgent>(agentEntries);
}

document.querySelector("#speak")?.addEventListener("click", () => {
  for (const agent of selectedAgents()) {
    agent.speak(messageInput.value, {
      balloonPosition: balloonPositionSelect.value as BalloonPosition,
      actions: balloonActions(agent)
    });
  }
});

balloonPositionSelect.addEventListener("change", () => {
  for (const agent of selectedAgents()) {
    agent.setBalloonPosition(balloonPositionSelect.value as BalloonPosition);
  }
});

document.querySelector("#animate")?.addEventListener("click", () => {
  const animation = animationSelect.value;
  const targets = selectedAgents();
  for (const agent of targets) {
    agent.play(animation);
  }
});

document.querySelector("#perform")?.addEventListener("click", () => {
  const intent = intentSelect.value as AgentIntents;
  for (const agent of selectedAgents()) {
    agent.perform(intent);
  }
});

document.querySelector("#stop")?.addEventListener("click", () => {
  for (const agent of selectedAgents()) {
    agent.stop();
  }
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

function balloonActions(agent: ClippyAgent): Array<{ id: string; label: string }> {
  const intents = new Set(agent.intents());
  const actions = [{ id: "arrive", label: "Arrive" }];
  if (intents.has(AgentIntents.GoAway)) {
    actions.push({ id: "go-away", label: "Go away" });
  }
  return actions;
}

function gridPosition(index: number): { x: number; y: number } {
  const columns = Math.min(GRID_COLUMNS, agentNames.length);
  return {
    x: GRID_START_X + (index % columns) * GRID_SPACING_X,
    y: GRID_START_Y + Math.floor(index / columns) * GRID_SPACING_Y
  };
}

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Demo control ${selector} is missing from the page.`);
  return element;
}
