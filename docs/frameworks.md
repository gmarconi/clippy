# Framework Integration

The core runtime is framework-agnostic. Mount an agent after the component is in the DOM and call `destroy()` during cleanup.

## React

```tsx
import { useEffect, useRef } from "react";
import { createClippy, type ClippyAgent } from "@gmarconi/clippy";
import "@gmarconi/clippy/style.css";

export function ClippyWidget() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let agent: ClippyAgent | undefined;
    let cancelled = false;

    void createClippy({
      container: hostRef.current ?? document.body
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
import { createClippy, type ClippyAgent } from "@gmarconi/clippy";
import "@gmarconi/clippy/style.css";

const host = ref<HTMLElement | null>(null);
let agent: ClippyAgent | undefined;
let cancelled = false;

onMounted(async () => {
  const loaded = await createClippy({
    container: host.value ?? document.body
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
  import { createClippy, type ClippyAgent } from "@gmarconi/clippy";
  import "@gmarconi/clippy/style.css";

  let host: HTMLDivElement;

  onMount(() => {
    let agent: ClippyAgent | undefined;
    let cancelled = false;

    void createClippy({
      container: host
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
