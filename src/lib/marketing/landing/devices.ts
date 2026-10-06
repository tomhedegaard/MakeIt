/**
 * Product photos for the HRV chapter's "Virker med" devices, in the order
 * of `Marketing.landing.chapters.heart.devices` (WHOOP, Oura, Polar,
 * Apple Watch). Each stays null until the maker has given written
 * permission to show it (press kits are editorial only, and Apple only
 * allows a genuine photograph to show compatibility). A null slot shows
 * the device's name instead. The gate test checks each file exists once
 * set. Files go in `public/landing/devices/`, cut out on transparent.
 */
export type DevicePhoto = { src: string; width: number; height: number; credit: string };

export const DEVICE_PHOTOS: readonly (DevicePhoto | null)[] = [null, null, null, null];
