/**
 * Which of the HRV chapter's "Virker med" devices are not readable yet,
 * in the order of `Marketing.landing.chapters.heart.devices` (WHOOP,
 * Oura, Polar, Apple Watch). WHOOP, Oura and Polar are read on the
 * server today; Apple Watch needs HealthKit in the iPhone app
 * (docs/APP_STORE_PLAN.md). Flip the flag when it ships.
 */
export const DEVICE_SOON: readonly boolean[] = [false, false, false, true];
