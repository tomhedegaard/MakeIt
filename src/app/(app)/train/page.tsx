import { redirect } from "next/navigation";

/**
 * `/train` is an IA shell, not a surface. Nav and dashboard point members
 * at training, but the content lives on `/coaching` (their program) and
 * `/train/exercises` (the catalogue) — so a guessed or bookmarked `/train`
 * used to 404 in the middle of the app.
 *
 * Guessed *public* URLs are handled by `PUBLIC_REDIRECTS`
 * (src/lib/auth/public-paths.ts). `/train` sits behind the auth gate, so it
 * stays a protected page that redirects instead: middleware still sends a
 * logged-out visitor to `/login?next=/train`, and only a member is forwarded
 * on to `/coaching`.
 */
export default function TrainRedirectPage() {
  redirect("/coaching");
}
