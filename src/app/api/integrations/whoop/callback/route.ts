import { NextResponse, type NextRequest } from "next/server";

/**
 * Whoop OAuth 2.0 redirect URI.
 *
 * Registered in the Whoop Developer Dashboard as:
 *   https://makeit.tomhedegaard.dk/api/integrations/whoop/callback
 *
 * This is a stub: it keeps the redirect URI live (no 404) so the app
 * can be registered with Whoop. The token exchange, scope handling and
 * data storage are a separate, later task — until then a returning
 * `code` is acknowledged but not yet exchanged for an access token.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");

  if (error) {
    return NextResponse.redirect(new URL("/settings?whoop=denied", url));
  }

  if (code) {
    return NextResponse.redirect(new URL("/settings?whoop=pending", url));
  }

  return NextResponse.redirect(new URL("/settings", url));
}
