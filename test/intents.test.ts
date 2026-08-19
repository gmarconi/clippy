// @ts-expect-error Node ambient types are intentionally not required by this browser package.
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { AgentIntents, Agents } from "../src/enums";
import { bundledAgentIntentMap } from "../src/intents";

function animationNames(agent: Agents): Set<string> {
  const data = JSON.parse(readFileSync(`public/agents/${agent}/agent.json`, "utf8")) as {
    animations: Record<string, unknown>;
  };
  return new Set(Object.keys(data.animations));
}

describe("bundledAgentIntentMap", () => {
  it("defines intent maps for every bundled agent", () => {
    expect(Object.keys(bundledAgentIntentMap).sort()).toEqual(Object.values(Agents).sort());
  });

  it("maps every bundled intent to an existing animation", () => {
    for (const agent of Object.values(Agents)) {
      const animations = animationNames(agent);
      for (const [intent, animation] of Object.entries(bundledAgentIntentMap[agent])) {
        expect(animations.has(animation), `${agent}.${intent} -> ${animation}`).toBe(true);
      }
    }
  });

  it("has arrival, go-away, rest, and greet intents for every bundled agent", () => {
    for (const agent of Object.values(Agents)) {
      expect(bundledAgentIntentMap[agent][AgentIntents.Arrive], `${agent}.Arrive`).toBeTruthy();
      expect(bundledAgentIntentMap[agent][AgentIntents.GoAway], `${agent}.GoAway`).toBeTruthy();
      expect(bundledAgentIntentMap[agent][AgentIntents.Rest], `${agent}.Rest`).toBeTruthy();
      expect(bundledAgentIntentMap[agent][AgentIntents.Greet], `${agent}.Greet`).toBeTruthy();
    }
  });

  it("maps Clippy go-away to the exact Goodbye animation", () => {
    expect(bundledAgentIntentMap[Agents.Clippy][AgentIntents.GoAway]).toBe("Goodbye");
  });

  it("only exposes intents shared by at least three bundled agents", () => {
    const coverage = new Map<string, number>();

    for (const agent of Object.values(Agents)) {
      for (const intent of Object.keys(bundledAgentIntentMap[agent])) {
        coverage.set(intent, (coverage.get(intent) ?? 0) + 1);
      }
    }

    for (const intent of Object.values(AgentIntents)) {
      expect(coverage.get(intent) ?? 0, intent).toBeGreaterThanOrEqual(3);
    }
  });

  it("does not skip Clippy's goodbye sequence from the first frame", () => {
    const data = JSON.parse(readFileSync("public/agents/Clippy/agent.json", "utf8")) as {
      animations: {
        Goodbye: {
          frames: Array<{
            branching?: unknown;
            exitBranch?: number;
          }>;
        };
      };
    };

    expect(data.animations.Goodbye.frames[0]?.branching).toBeUndefined();
    expect(data.animations.Goodbye.frames[0]?.exitBranch).toBeUndefined();
  });
});
