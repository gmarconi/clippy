# Modern Clippy

A small, framework-agnostic Clippy runtime for modern browsers.

- ESM and TypeScript first
- no jQuery
- no globals
- no CDN dependency
- local assets
- many isolated agents on the same page

## Why This Exists

The original [clippy.js](https://github.com/clippyjs/clippy.js/) made Microsoft Agent characters easy to use on the web, but it was built around older browser-era assumptions: jQuery, global state, CDN-hosted assets, and integration patterns that are awkward in modern apps.

This package is a small port for current frontend projects. It keeps the fun part, the animated agents, while making the runtime easier to import, type, configure, and clean up from React, Vue, Svelte, plain TypeScript, or any other DOM-based app.

## Demo

Try the browser demo at [gmarconi.github.io/clippy](https://gmarconi.github.io/clippy/).

The demo loads every bundled agent locally and lets you target one agent or all agents when speaking, playing exact animations, or performing shared intents.

## Install

```bash
npm install @gmarconi/clippy
```

Copy `public/agents` from this package into your app's public assets directory so it is served at `/agents/`. If your app serves those files from a different path, pass `assetsBaseUrl`.

## Usage

```ts
import { AgentAnimations, AgentIntents, createClippy } from "@gmarconi/clippy";
import "@gmarconi/clippy/style.css";

const clippy = await createClippy();

clippy.show();
clippy.perform(AgentIntents.Arrive);
clippy.play(AgentAnimations.GetAttention);
clippy.speak("Need help with that document?");
```

## Other Agents

```ts
import { AgentIntents, Agents, createClippy } from "@gmarconi/clippy";

const rover = await createClippy({
  agent: Agents.Rover,
  initialPosition: { x: 80, y: 160 }
});

const merlin = await createClippy({
  agent: Agents.Merlin,
  initialPosition: { x: 260, y: 160 }
});

rover.show();
merlin.show();

rover.perform(AgentIntents.Arrive);
merlin.speak("Different agents can share the same page.");
```

## Multiple Agents

```ts
import { Agents, createClippy } from "@gmarconi/clippy";

const agents = await Promise.all(
  Array.from({ length: 10 }, (_, index) =>
    createClippy({
      agent: Agents.Clippy,
      id: `clippy-${index}`,
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

| Enum | Agent |
| --- | --- |
| `Agents.Bonzi` | Bonzi |
| `Agents.Clippy` | Clippy |
| `Agents.F1` | F1 |
| `Agents.Genie` | Genie |
| `Agents.Genius` | Genius |
| `Agents.Links` | Links |
| `Agents.Merlin` | Merlin |
| `Agents.Peedy` | Peedy |
| `Agents.Rocky` | Rocky |
| `Agents.Rover` | Rover |

Custom agent folders are still possible by passing a string as `agent`, but app code should prefer the enum for built-ins.

## Intents

Every bundled agent exposes its own animation names. Some names are shared, some are not, and some agents use different names for the same idea. For example, one agent may arrive with `Greeting`, another with `Show`, and another with `Announce`.

Use `play(animation)` when you want an exact animation name. It is intentionally strict: if that agent does not have the animation, nothing plays and the method returns `false`.

Use `perform(intent)` when you want a generic action across different agents. Intents map common actions to each bundled agent's closest matching animation:

```ts
import { AgentIntents } from "@gmarconi/clippy";

clippy.perform(AgentIntents.Arrive);
clippy.perform(AgentIntents.GoAway);
clippy.perform(AgentIntents.Wave);
```

```ts
rover.perform(AgentIntents.Arrive); // Rover uses Show
merlin.perform(AgentIntents.Arrive); // Merlin uses Announce
clippy.perform(AgentIntents.Arrive); // Clippy uses Greeting
```

Intent mappings are curated per agent and only cover behaviors that make sense as reusable actions. They do not replace the full animation list. Agent-specific one-offs remain available through exact `play(animation)` calls, and you can inspect what an agent supports with `agent.animations()` and `agent.intents()`.

Custom agents can provide their own intent map:

```ts
await createClippy({
  agent: "MyAgent",
  assetsBaseUrl: "/custom-agents/",
  intentMap: {
    [AgentIntents.Arrive]: "Intro",
    [AgentIntents.GoAway]: "Exit"
  }
});
```

## Options

`createClippy(options?)` accepts:

| Option | Default | Description |
| --- | --- | --- |
| `agent` | `Agents.Clippy` | Built-in agent enum value or a custom agent folder name. |
| `assetsBaseUrl` | `"/agents/"` | Public URL containing the agent folders. |
| `container` | `document.body` | DOM element that receives the agent root element. |
| `id` | none | Optional `id` for the agent root element. |
| `sounds` | `true` | Set `false` to disable sound loading and playback. |
| `soundFormat` | `"auto"` | `"auto"`, `"mp3"`, or `"ogg"`. Auto prefers OGG when supported. |
| `soundMap` | none | Override individual sound IDs without editing bundled assets. |
| `intentMap` | bundled map | Add or override intent-to-animation mappings. |
| `stopOnNewAction` | `true` | Interrupt queued work when a new command starts. |
| `draggable` | `true` | Let users drag the agent with the pointer. |
| `balloonPosition` | `BalloonPosition.Left` | Default speech balloon position. |
| `balloonOffset` | `{ x: 10, y: 10 }` | Default speech balloon offset. |
| `className` | none | Extra class name for the agent root element. |
| `initialPosition` | near the lower-right viewport edge | Initial `{ x, y }` page position. |

## Common Settings

New commands interrupt the current queued work by default. That keeps clicks and app events responsive:

```ts
await createClippy({
  stopOnNewAction: false
});
```

Set `stopOnNewAction: false` to preserve the original Clippy-style sequencing.

`soundFormat` defaults to `"auto"` and prefers OGG when the browser supports it, then falls back to MP3. Use `"mp3"` or `"ogg"` to force a specific local sound map while testing:

```ts
await createClippy({
  soundFormat: "mp3"
});
```

You can override individual sound IDs without editing bundled assets:

```ts
const soundMap = await fetch("/agents/Clippy/sounds-mp3.json").then((response) => response.json());

await createClippy({
  soundFormat: "mp3",
  soundMap: {
    "10": soundMap["14"]
  }
});
```

Agents are draggable by default. Set `draggable: false` if your app controls position entirely:

```ts
await createClippy({
  draggable: false
});
```

Speech balloons default to `BalloonPosition.Left`. The runtime anchors balloons to the visible sprite pixels instead of the full sprite frame, which keeps agents with transparent padding from pushing the balloon far away. Configure the default position at creation time:

```ts
import { BalloonPosition, createClippy } from "@gmarconi/clippy";

const clippy = await createClippy({
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

By default, `createClippy()` loads assets from `/agents/`. Pass `assetsBaseUrl` only when your app serves the copied agent folders from a different path; it should point at the directory containing the agent folders and end with `/`.

## API

```ts
createClippy(options?): Promise<ClippyAgent>
```

`ClippyAgent` methods:

| Method | Description |
| --- | --- |
| `show(fast?)` | Show the agent. Uses the agent's `Show` animation unless `fast` is true or no `Show` animation exists. |
| `hide(fast?)` | Hide the agent. Uses the agent's `Hide` animation unless `fast` is true or no `Hide` animation exists. |
| `play(animation, options?)` | Play an exact animation name. Returns `false` if the animation does not exist. |
| `perform(intent, options?)` | Play the animation mapped to an intent. Returns `false` if the intent is not mapped. |
| `animate()` | Play a random non-idle animation. |
| `speak(text, options?)` | Show a speech balloon, optionally with action buttons. |
| `moveTo(x, y, options?)` | Move the agent to a page position. |
| `gestureAt(x, y)` | Gesture or look toward a page position. |
| `stopCurrent()` | Ask the current animation to exit and close the balloon. |
| `stop()` | Clear queued work, stop animation, close the balloon, and return to rest pose. |
| `closeBalloon()` | Close the speech balloon. |
| `setBalloonPosition(position, offset?)` | Change the default speech balloon placement. |
| `delay(ms?)` | Queue a delay. |
| `hasAnimation(name)` | Check whether an exact animation exists. |
| `animations()` | List exact animation names for the agent. |
| `intents()` | List generic intents available for the agent. |
| `destroy()` | Remove DOM nodes and event listeners. |

## License

MIT. Use it freely in personal, commercial, open-source, and private projects.

## Thanks

This project exists because of the original [clippy.js](https://github.com/clippyjs/clippy.js/) project and the later [kevinvissers/clippyjs](https://github.com/kevinvissers/clippyjs) rewrite attempt. This package keeps that spirit, but updates the runtime for modern ESM/TypeScript apps, local assets, and framework-agnostic usage.
