/**
 * Status bar follows the surface theme (Nord, spec 2026-09-26 §3).
 * The plugin comes from the shell-injected runtime (window.Capacitor.Plugins),
 * like NativePushToggle; nothing is bundled.
 */
export type StatusBarStyle = "LIGHT" | "DARK";

export type StatusBarPlugin = {
  setStyle: (o: { style: StatusBarStyle }) => Promise<void>;
  setBackgroundColor: (o: { color: string }) => Promise<void>;
};

const BACKGROUND = { LIGHT: "#FFFFFF", DARK: "#111111" } as const;

/** Capacitor naming: LIGHT = dark text for light backgrounds. */
export function statusBarStyleFor(colorScheme: string): StatusBarStyle {
  return colorScheme.trim() === "light" ? "LIGHT" : "DARK";
}

/**
 * Reads the active theme straight from the DOM instead of the computed
 * `color-scheme` (which is derived via `html:has(.theme-root[data-theme=…])`
 * in globals.css — `:has()` is absent in older Android WebViews). Mirrors
 * the CSS cascade: Nord nat is declared after Nord lys, so nat wins when
 * both are present, and light is the fallback because Nord lys now sits on
 * `:root`.
 */
export function schemeFromDocument(doc: Pick<Document, "querySelector">): "light" | "dark" {
  if (doc.querySelector('.theme-root[data-theme="nat"]')) return "dark";
  return "light";
}

export async function syncStatusBar(plugin: StatusBarPlugin | undefined, colorScheme: string): Promise<boolean> {
  if (!plugin) return false;
  const style = statusBarStyleFor(colorScheme);
  await plugin.setStyle({ style }).catch(() => {});
  await plugin.setBackgroundColor({ color: BACKGROUND[style] }).catch(() => {});
  return true;
}

export function statusBarPlugin(): StatusBarPlugin | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as { Capacitor?: { Plugins?: { StatusBar?: StatusBarPlugin } } }).Capacitor?.Plugins?.StatusBar;
}
