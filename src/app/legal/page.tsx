import { redirect } from "next/navigation";
import { PUBLIC_REDIRECTS } from "@/lib/auth/public-paths";

/** Guessed URL → privacy policy. Public redirect, not an app surface. */
export default function LegalRedirectPage() {
  redirect(PUBLIC_REDIRECTS["/legal"]);
}
