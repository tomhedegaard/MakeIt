import { redirect } from "next/navigation";
import { PUBLIC_REDIRECTS } from "@/lib/auth/public-paths";

/** Guessed URL → landing waitlist section. Public redirect, not an app surface. */
export default function WaitlistRedirectPage() {
  redirect(PUBLIC_REDIRECTS["/waitlist"]);
}
