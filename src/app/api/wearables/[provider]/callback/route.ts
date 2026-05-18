import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { whoopProvider } from "@/lib/hrv/wearables/whoop";
import { encryptToken, decryptToken } from "@/lib/hrv/wearables/crypto";
import { syncConnection } from "@/lib/hrv/wearables/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Name of the single-use OAuth state cookie set by the connect route (Task 8). */
const STATE_COOKIE = "hrv_oauth_state";

/** Shape of the JSON value stored in the `hrv_oauth_state` cookie. */
interface OAuthStateCookie {
  state: string;
  provider: string;
}

function redirectTo(request: NextRequest, path: string): NextResponse {
  return NextResponse.redirect(new URL(path, request.url));
}

/**
 * Wearable OAuth callback (W1 — WHOOP only).
 *
 * WHOOP redirects the member's browser here with an authorization `code`.
 * We validate the single-use CSRF `state` cookie, exchange the code for
 * tokens, encrypt and store them in `hrv_wearable_connections`, then run
 * a best-effort initial sync. Any failure redirects back to `/hrv` with
 * an `error` query param the page can surface.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
): Promise<NextResponse> {
  const { provider } = await params;

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const queryState = url.searchParams.get("state");

  // --- Step 2: validate + consume the single-use state cookie. ---
  const cookieStore = await cookies();
  const rawCookie = cookieStore.get(STATE_COOKIE)?.value;

  // The cookie is single-use: delete it no matter what happens next.
  cookieStore.delete(STATE_COOKIE);

  let cookieState: OAuthStateCookie | null = null;
  if (rawCookie) {
    try {
      const parsed = JSON.parse(rawCookie) as Partial<OAuthStateCookie>;
      if (typeof parsed.state === "string" && typeof parsed.provider === "string") {
        cookieState = { state: parsed.state, provider: parsed.provider };
      }
    } catch {
      cookieState = null;
    }
  }

  if (
    !cookieState ||
    !queryState ||
    cookieState.state !== queryState ||
    cookieState.provider !== provider
  ) {
    return redirectTo(request, "/hrv?error=state_mismatch");
  }

  // --- Step 3: W1 only supports WHOOP. ---
  if (provider !== "whoop") {
    return redirectTo(request, "/hrv?error=unsupported_provider");
  }

  // --- Step 4: resolve the current member. ---
  const supabase = await createClient();
  if (!supabase) {
    return redirectTo(request, "/hrv?error=no_session");
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return redirectTo(request, "/hrv?error=no_session");
  }

  if (!code) {
    return redirectTo(request, "/hrv?error=connect_failed");
  }

  try {
    const encKey = process.env.HRV_TOKEN_ENC_KEY;
    if (!encKey) {
      throw new Error("HRV_TOKEN_ENC_KEY is not set.");
    }

    // --- Step 5 + 6: exchange the code for tokens. ---
    // The redirect URI must match the one used to start the OAuth flow.
    const redirectUri = new URL(
      "/api/wearables/whoop/callback",
      request.url,
    ).toString();
    const tokens = await whoopProvider.exchangeCode(code, redirectUri);

    // --- Step 7: encrypt tokens at rest. ---
    const encryptedAccess = encryptToken(tokens.accessToken, encKey);
    const encryptedRefresh =
      tokens.refreshToken !== null
        ? encryptToken(tokens.refreshToken, encKey)
        : null;

    const service = createServiceClient();

    // --- Step 8: first active connection for the member becomes primary. ---
    const { data: activeRows, error: activeError } = await service
      .from("hrv_wearable_connections")
      .select("id")
      .eq("member_id", user.id)
      .eq("status", "active");
    if (activeError) {
      throw new Error(
        `Failed to check existing connections: ${activeError.message}`,
      );
    }
    const isPrimary = (activeRows?.length ?? 0) === 0;

    const tokenExpiresAt = new Date(
      Date.now() + tokens.expiresInSeconds * 1000,
    ).toISOString();

    const { error: upsertError } = await service
      .from("hrv_wearable_connections")
      .upsert(
        {
          member_id: user.id,
          provider,
          provider_user_id: tokens.providerUserId,
          access_token: encryptedAccess,
          refresh_token: encryptedRefresh,
          token_expires_at: tokenExpiresAt,
          status: "active",
          is_primary: isPrimary,
        },
        { onConflict: "member_id,provider" },
      );
    if (upsertError) {
      throw new Error(`Failed to store connection: ${upsertError.message}`);
    }

    // --- Step 9: best-effort initial sync. Must NOT fail the callback. ---
    try {
      const { data: connRow, error: connError } = await service
        .from("hrv_wearable_connections")
        .select(
          "id, member_id, provider, access_token, refresh_token, token_expires_at",
        )
        .eq("member_id", user.id)
        .eq("provider", provider)
        .single();
      if (connError || !connRow) {
        throw new Error(
          connError?.message ?? "Connection row not found after upsert.",
        );
      }

      const result = await syncConnection({
        connection: {
          id: connRow.id,
          memberId: connRow.member_id,
          provider: "whoop",
          accessToken: decryptToken(connRow.access_token, encKey),
          refreshToken:
            connRow.refresh_token !== null
              ? decryptToken(connRow.refresh_token, encKey)
              : null,
          tokenExpiresAt: connRow.token_expires_at,
        },
        provider: whoopProvider,
        priorLnRmssd: [],
        // Freshly-connected connection has no readings yet — never deduped.
        lastReadingProviderRecordedAt: null,
        now: new Date(),
      });

      // Persist any refreshed tokens returned by the sync.
      if (result.tokens) {
        const refreshed = result.tokens;
        await service
          .from("hrv_wearable_connections")
          .update({
            access_token: encryptToken(refreshed.accessToken, encKey),
            refresh_token:
              refreshed.refreshToken !== null
                ? encryptToken(refreshed.refreshToken, encKey)
                : null,
            token_expires_at: new Date(
              Date.now() + refreshed.expiresInSeconds * 1000,
            ).toISOString(),
          })
          .eq("id", connRow.id);
      }

      // Store the initial reading, if the sync produced one.
      if (result.status === "reading") {
        await service.from("hrv_readings").insert(result.reading);
        await service
          .from("hrv_wearable_connections")
          .update({ last_synced_at: new Date().toISOString() })
          .eq("id", connRow.id);
      }
    } catch (syncError) {
      // Initial sync is best-effort: log and continue. The connection is
      // stored, so the Task 9 cron will pick it up on its next run.
      console.error("[wearables/callback] initial sync failed:", syncError);
    }
  } catch (error) {
    console.error("[wearables/callback] connect failed:", error);
    return redirectTo(request, "/hrv?error=connect_failed");
  }

  // --- Step 10: success. ---
  return redirectTo(request, "/hrv");
}
