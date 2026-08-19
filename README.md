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
import { AgentAnimations, Agents, createClippy } from "@local/clippy";
import "@local/clippy/style.css";

const clippy = await createClippy({
  agent: Agents.Clippy,
  assetsBaseUrl: "/agents/",
  stopOnNewAction: true,
  draggable: true
});

clippy.show();
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

`soundFormat` defaults to `"auto"` and prefers MP3 when the browser supports it. Use `"mp3"` or `"ogg"` to force a specific local sound map while testing.

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
- `animate()`
- `speak(text, options?)`
- `moveTo(x, y, options?)`
- `gestureAt(x, y)`
- `stopCurrent()`
- `stop()`
- `closeBalloon()`
- `delay(ms?)`
- `hasAnimation(name)`
- `animations()`
- `destroy()`
