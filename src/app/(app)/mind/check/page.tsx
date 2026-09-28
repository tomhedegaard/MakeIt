import { redirect } from "next/navigation";

/**
 * Legacy `/mind/check` — the daily surface now lives at `/mind`.
 * Keep the path so dashboard tiles, crons, and old links still resolve.
 */
export default function MindCheckRedirect() {
  redirect("/mind");
}
