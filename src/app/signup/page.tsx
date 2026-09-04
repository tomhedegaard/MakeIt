import { redirect } from "next/navigation";
import { PUBLIC_REDIRECTS } from "@/lib/auth/public-paths";

/** Guessed URL → invite-gated login. Public redirect, not an app surface. */
export default function SignupRedirectPage() {
  redirect(PUBLIC_REDIRECTS["/signup"]);
}
