import type { WearableProvider } from "./types";
import { whoopProvider } from "./whoop";
import { ouraProvider } from "./oura";
import { polarProvider } from "./polar";

/**
 * All wearable providers wired into the platform, keyed by provider id.
 * A provider is "supported" iff it appears here.
 */
const providers: Record<string, WearableProvider> = {
  whoop: whoopProvider,
  oura: ouraProvider,
  polar: polarProvider,
};

/**
 * Resolve a wearable provider by id. Returns `null` for any id that is not
 * registered (unknown strings).
 */
export function getProvider(id: string): WearableProvider | null {
  return providers[id] ?? null;
}
