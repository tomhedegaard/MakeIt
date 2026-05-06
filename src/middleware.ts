import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { updateSupabaseSession } from "@/lib/supabase/middleware";

const PROTECTED = [
  "/dashboard",
  "/coaching",
  "/community",
  "/reps",
  "/profile",
  "/session",
  "/onboarding",
];

function needsAuth(pathname: string) {
  return PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (SUPABASE_ENABLED) {
    const { response, user } = await updateSupabaseSession(req);
    if (needsAuth(pathname) && !user) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return response;
  }

  // Demo mode — cookie-based mock
  if (!needsAuth(pathname)) return NextResponse.next();
  const session = req.cookies.get(SESSION_COOKIE)?.value;
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on everything except static and API internals — Supabase needs to
    // refresh cookies on every request when enabled.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)).*)",
  ],
};
