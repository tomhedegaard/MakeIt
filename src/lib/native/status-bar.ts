/**
 * Status bar follows the surface theme (spec 2026-09-17 §6, D3).
 * The plugin comes from the shell-injected runtime (window.Capacitor.Plugins),
 * like NativePushToggle; nothing is bundled.
 */
export type StatusBarStyle = "LIGHT" | "DARK";

export type StatusBarPlugin = {
  setStyle: (o: { style: StatusBarStyle }) => Promise<void>;
  setBackgroundColor: (o: { color: string }) => Promise<void>;
};

const BACKGROUND = { LIGHT: "#E7E9EB", DARK: "#0A0A0B" } as const;

/** Capacitor naming: LIGHT = dark text for light backgrounds. */
export function statusBarStyleFor(colorScheme: string): StatusBarStyle {
  return colorScheme.trim() === "light" ? "LIGHT" : "DARK";
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
