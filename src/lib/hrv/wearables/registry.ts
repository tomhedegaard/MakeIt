import type { WearableProvider } from "./types";
import { whoopProvider } from "./whoop";
import { ouraProvider } from "./oura";

/**
 * All wearable providers wired into the platform, keyed by provider id.
 * A provider is "supported" iff it appears here — `polar` is a valid
 * `WearableProvider["id"]` but is intentionally not registered yet.
 */
const providers: Record<string, WearableProvider> = {
  whoop: whoopProvider,
  oura: ouraProvider,
};

/**
 * Resolve a wearable provider by id. Returns `null` for any id that is not
 * registered (unknown strings, or known-but-unshipped providers like `polar`).
 */
export function getProvider(id: string): WearableProvider | null {
  return providers[id] ?? null;
}
