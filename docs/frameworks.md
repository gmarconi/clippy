# Framework Integration

The core runtime is framework-agnostic. Mount an agent after the component is in the DOM and call `destroy()` during cleanup.

## React

```tsx
import { useEffect, useRef } from "react";
import { Agents, createClippy, type ClippyAgent } from "@local/clippy";
import "@local/clippy/style.css";

export function ClippyWidget() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let agent: ClippyAgent | undefined;
    let cancelled = false;

    void createClippy({
      agent: Agents.Clippy,
      container: hostRef.current ?? document.body,
      assetsBaseUrl: "/agents/",
      stopOnNewAction: true,
      draggable: true
    }).then((loaded) => {
      if (cancelled) {
        loaded.destroy();
        return;
      }
      agent = loaded;
      agent.show();
    });

    return () => {
      cancelled = true;
      agent?.destroy();
    };
  }, []);

  return <div ref={hostRef} />;
}
```

## Vue

```vue
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { Agents, createClippy, type ClippyAgent } from "@local/clippy";
import "@local/clippy/style.css";

const host = ref<HTMLElement | null>(null);
let agent: ClippyAgent | undefined;
let cancelled = false;

onMounted(async () => {
  const loaded = await createClippy({
    agent: Agents.Clippy,
    container: host.value ?? document.body,
    assetsBaseUrl: "/agents/",
    stopOnNewAction: true,
    draggable: true
  });

  if (cancelled) {
    loaded.destroy();
    return;
  }

  agent = loaded;
  agent.show();
});

onUnmounted(() => {
  cancelled = true;
  agent?.destroy();
});
</script>

<template>
  <div ref="host" />
</template>
```

## Svelte

```svelte
<script lang="ts">
  import { onMount } from "svelte";
  import { Agents, createClippy, type ClippyAgent } from "@local/clippy";
  import "@local/clippy/style.css";

  let host: HTMLDivElement;

  onMount(() => {
    let agent: ClippyAgent | undefined;
    let cancelled = false;

    void createClippy({
      agent: Agents.Clippy,
      container: host,
      assetsBaseUrl: "/agents/",
      stopOnNewAction: true,
      draggable: true
    }).then((loaded) => {
      if (cancelled) {
        loaded.destroy();
        return;
      }
      agent = loaded;
      agent.show();
    });

    return () => {
      cancelled = true;
      agent?.destroy();
    };
  });
</script>

<div bind:this={host}></div>
```
