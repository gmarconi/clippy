# Modern Clippy

A small, framework-agnostic Clippy runtime for modern browsers.

- ESM and TypeScript first
- no jQuery
- no globals
- no CDN dependency
- local assets
- many isolated agents on the same page

## Install

```bash
npm install @local/clippy
```

Copy `public/agents` from this package into your app's public assets directory.

## Usage

```ts
import { AgentAnimations, AgentIntents, Agents, BalloonPosition, createClippy } from "@local/clippy";
import "@local/clippy/style.css";

const clippy = await createClippy({
  agent: Agents.Clippy,
  assetsBaseUrl: "/agents/",
  stopOnNewAction: true,
  draggable: true,
  balloonPosition: BalloonPosition.Left
});

clippy.show();
clippy.perform(AgentIntents.Arrive);
clippy.play(AgentAnimations.GetAttention);
clippy.speak("It looks like you're building a local-first app.");
```

## Multiple Agents

```ts
import { Agents, createClippy } from "@local/clippy";

const agents = await Promise.all(
  Array.from({ length: 10 }, (_, index) =>
    createClippy({
      agent: Agents.Clippy,
      id: `clippy-${index}`,
      assetsBaseUrl: "/agents/",
      initialPosition: {
        x: 80 + index * 40,
        y: 120 + index * 20
      }
    })
  )
);

agents.forEach((agent) => agent.show(true));
```

## Built-In Agents

Use the `Agents` enum instead of string literals:

```ts
Agents.Clippy
Agents.Merlin
Agents.Rover
Agents.Genie
```

Custom agent folders are still possible by passing a string as `agent`, but app code should prefer the enum for built-ins.

## Intents

`play(animation)` is exact: if an agent does not have that animation name, it does nothing and returns `false`.

Use `perform(intent)` when you want the best equivalent behavior for each bundled agent:

```ts
import { AgentIntents } from "@local/clippy";

clippy.perform(AgentIntents.Arrive);
clippy.perform(AgentIntents.GoAway);
clippy.perform(AgentIntents.Wave);
```

Bundled intent mappings are curated per agent and only cover behaviors shared by at least three bundled agents. For example, `AgentIntents.Arrive` maps to `Greeting` for Clippy, `Show` for Rover, and `Announce` for Merlin and Peedy. Agent-specific one-offs such as Rover's `Books` or `Cooking` remain available through exact `play(animation)` calls.

Custom agents can provide their own intent map:

```ts
await createClippy({
  agent: "MyAgent",
  assetsBaseUrl: "/agents/",
  intentMap: {
    [AgentIntents.Arrive]: "Intro",
    [AgentIntents.GoAway]: "Exit"
  }
});
```

## Interaction Defaults

New commands interrupt the current queued work by default. That keeps clicks and app events responsive:

```ts
await createClippy({
  agent: Agents.Clippy,
  assetsBaseUrl: "/agents/",
  soundFormat: "auto",
  stopOnNewAction: true
});
```

`soundFormat` defaults to `"auto"` and prefers OGG when the browser supports it, then falls back to MP3. Use `"mp3"` or `"ogg"` to force a specific local sound map while testing.

You can override individual sound IDs without editing bundled assets:

```ts
const soundMap = await fetch("/agents/Clippy/sounds-mp3.json").then((response) => response.json());

await createClippy({
  agent: Agents.Clippy,
  assetsBaseUrl: "/agents/",
  soundFormat: "mp3",
  soundMap: {
    "10": soundMap["14"]
  }
});
```

To preserve the original Clippy-style sequencing, disable it:

```ts
await createClippy({
  agent: Agents.Clippy,
  assetsBaseUrl: "/agents/",
  stopOnNewAction: false
});
```

Agents are draggable by default. Set `draggable: false` if your app controls position entirely:

```ts
await createClippy({
  agent: Agents.Clippy,
  assetsBaseUrl: "/agents/",
  draggable: false
});
```

Speech balloons default to `BalloonPosition.Left`. The runtime anchors balloons to the visible sprite pixels instead of the full sprite frame, which keeps agents with transparent padding from pushing the balloon far away. Configure the default position at creation time:

```ts
import { Agents, BalloonPosition, createClippy } from "@local/clippy";

const clippy = await createClippy({
  agent: Agents.Clippy,
  assetsBaseUrl: "/agents/",
  balloonPosition: BalloonPosition.Bottom,
  balloonOffset: { y: 8 }
});
```

You can also change it later or for a single message:

```ts
clippy.setBalloonPosition(BalloonPosition.Right, { x: 8 });

clippy.speak("I can move this bubble per message.", {
  balloonPosition: BalloonPosition.Top,
  balloonOffset: { y: 8 }
});
```

Balloon actions render below the message as blue-bullet buttons:

```ts
clippy.element.addEventListener("clippy:balloon-action", (event) => {
  const { action } = (event as CustomEvent<{ action: { id?: string } }>).detail;
  if (action.id === "arrive") clippy.perform(AgentIntents.Arrive);
  if (action.id === "go-away") clippy.perform(AgentIntents.GoAway);
});

clippy.speak("What should I do next?", {
  actions: [
    { id: "arrive", label: "Arrive" },
    { id: "go-away", label: "Go away" }
  ]
});
```

## Frameworks

This package intentionally does not ship React, Vue, or Svelte adapters. The runtime only needs a DOM node and explicit cleanup, so framework wrappers would add long-term maintenance without much value.

See [docs/frameworks.md](docs/frameworks.md).

Sound extraction from original `.ACS`/`.ACT` files is documented in [docs/sound-extraction.md](docs/sound-extraction.md).

## Local Assets

The loader expects this shape:

```text
public/agents/
  Clippy/
    agent.json
    map.png
    sounds-mp3.json
    sounds-ogg.json
```

`assetsBaseUrl` must point at the directory containing the agent folders and should end with `/`.

## API

```ts
createClippy(options): Promise<ClippyAgent>
```

`ClippyAgent` methods:

- `show(fast?: boolean)`
- `hide(fast?: boolean)`
- `play(animation, options?)`
- `perform(intent, options?)`
- `animate()`
- `speak(text, options?)`
- `moveTo(x, y, options?)`
- `gestureAt(x, y)`
- `stopCurrent()`
- `stop()`
- `closeBalloon()`
- `setBalloonPosition(position, offset?)`
- `delay(ms?)`
- `hasAnimation(name)`
- `animations()`
- `intents()`
- `destroy()`
