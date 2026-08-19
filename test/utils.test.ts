import { describe, expect, it } from "vitest";
import { joinUrl } from "../src/utils";

describe("joinUrl", () => {
  it("supports relative asset bases", () => {
    expect(joinUrl("/agents/", "Clippy", "agent.json")).toBe("/agents/Clippy/agent.json");
  });

  it("supports absolute asset bases", () => {
    expect(joinUrl("https://example.test/assets", "Merlin", "map.png")).toBe(
      "https://example.test/assets/Merlin/map.png"
    );
  });
});
