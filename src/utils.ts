export function joinUrl(base: string, ...parts: string[]): string {
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const path = parts.map((part) => encodeURIComponent(part)).join("/");
  return `${normalizedBase}/${path}`;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}
