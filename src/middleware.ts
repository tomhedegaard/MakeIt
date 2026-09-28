import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";
import { needsAuth, normalizePathname, publicRedirectFor } from "@/lib/auth/public-paths";
import { youthClaims, youthMayOpen } from "@/lib/youth/routes";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { updateSupabaseSession } from "@/lib/supabase/middleware";

function redirectToLogin(req: NextRequest, pathname: string) {
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

function redirectPublicAlias(req: NextRequest) {
  const dest = publicRedirectFor(req.nextUrl.pathname);
  if (!dest) return null;
  return NextResponse.redirect(new URL(dest, req.url));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const alias = redirectPublicAlias(req);
  if (alias) return alias;

  if (SUPABASE_ENABLED) {
    const { response, user } = await updateSupabaseSession(req);
    if (needsAuth(pathname) && !user) {
      return redirectToLogin(req, pathname);
    }
    // MakeIt Ung: a young account only opens the routes of the youth
    // product. The claim is server-written app_metadata (spec afsnit 3).
    if (user && needsAuth(pathname)) {
      const claims = youthClaims(user.app_metadata);
      if (claims.youth && !youthMayOpen(normalizePathname(pathname), claims)) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }
    return response;
  }

  // Demo mode — cookie-based mock. Public paths stay open;
  // everything else requires mi_session (MUNK-01 still works).
  if (!needsAuth(pathname)) return NextResponse.next();
  const session = req.cookies.get(SESSION_COOKIE)?.value;
  if (!session) return redirectToLogin(req, pathname);
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on everything except static, API routes (incl. Stripe webhook
    // and /api/settings/export — those self-auth), and image and video
    // assets (public MoveKit loops play on the logged-out landing).
    // Supabase needs to refresh cookies on every matched request.
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webm|mp4)).*)",
  ],
};
