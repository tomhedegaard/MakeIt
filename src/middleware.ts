import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";
import { needsAuth, publicRedirectFor } from "@/lib/auth/public-paths";
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
    // and /api/settings/export — those self-auth), and image assets.
    // Supabase needs to refresh cookies on every matched request.
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)).*)",
  ],
};
