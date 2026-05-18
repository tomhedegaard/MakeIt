import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { whoopProvider } from "@/lib/hrv/wearables/whoop";
import { encryptToken, decryptToken } from "@/lib/hrv/wearables/crypto";
import { syncConnection } from "@/lib/hrv/wearables/sync";
import type { WearableProvider } from "@/lib/hrv/wearables/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Daily wearable-sync cron (W1 — WHOOP only).
 *
 * Triggered by Vercel Cron once a day. For every `active`
 * `hrv_wearable_connections` row it pulls the member's latest HRV reading
 * from the wearable provider and writes a `hrv_readings` row. Each
 * connection is processed in its own try/catch so one failure cannot abort
 * the whole batch. Refreshed OAuth tokens are re-encrypted before being
 * persisted; auth failures flip the connection to `needs_reauth`.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // --- Step 1: verify the Vercel Cron bearer secret. ---
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  const encKey = process.env.HRV_TOKEN_ENC_KEY;
  if (!encKey) {
    console.error("[cron/hrv-wearable-sync] HRV_TOKEN_ENC_KEY is not set.");
    return new NextResponse("misconfigured", { status: 500 });
  }

  // --- Step 2: service-role client (RLS bypass for background work). ---
  const supabase = createServiceClient();

  // --- Step 3: every active connection. ---
  const { data: connections, error: connError } = await supabase
    .from("hrv_wearable_connections")
    .select(
      "id, member_id, provider, access_token, refresh_token, token_expires_at",
    )
    .eq("status", "active");
  if (connError) {
    console.error(
      "[cron/hrv-wearable-sync] failed to load connections:",
      connError.message,
    );
    return new NextResponse("query failed", { status: 500 });
  }

  /** W1 only ships the WHOOP provider; others are skipped until later phases. */
  const providers: Record<string, WearableProvider> = {
    whoop: whoopProvider,
  };

  let readings = 0;
  const rows = connections ?? [];

  // --- Step 4: process each connection in isolation. ---
  for (const conn of rows) {
    try {
      // Step 4c: resolve the provider (skip unknown providers).
      const provider = providers[conn.provider];
      if (!provider) {
        console.warn(
          `[cron/hrv-wearable-sync] no handler for provider "${conn.provider}" ` +
            `(connection ${conn.id}); skipping.`,
        );
        continue;
      }

      // Step 4a: decrypt the stored OAuth tokens.
      const accessToken = decryptToken(conn.access_token, encKey);
      const refreshToken =
        conn.refresh_token !== null
          ? decryptToken(conn.refresh_token, encKey)
          : null;

      // Step 4b: prior lnRMSSD series scoped to THIS connection, chronological.
      const { data: priorRows, error: priorError } = await supabase
        .from("hrv_readings")
        .select("ln_rmssd")
        .eq("connection_id", conn.id)
        .order("measured_at", { ascending: true });
      if (priorError) {
        throw new Error(`prior readings query failed: ${priorError.message}`);
      }
      const priorLnRmssd = (priorRows ?? []).map((r) => r.ln_rmssd);

      // Step 4d: run the pure sync orchestration.
      const now = new Date();
      const result = await syncConnection({
        connection: {
          id: conn.id,
          memberId: conn.member_id,
          provider: "whoop",
          accessToken,
          refreshToken,
          tokenExpiresAt: conn.token_expires_at,
        },
        provider,
        priorLnRmssd,
        now,
      });

      // Step 4e: persist any refreshed tokens (re-encrypted at rest).
      if (result.tokens) {
        const refreshed = result.tokens;
        const { error: tokenError } = await supabase
          .from("hrv_wearable_connections")
          .update({
            access_token: encryptToken(refreshed.accessToken, encKey),
            refresh_token:
              refreshed.refreshToken !== null
                ? encryptToken(refreshed.refreshToken, encKey)
                : null,
            token_expires_at: new Date(
              now.getTime() + refreshed.expiresInSeconds * 1000,
            ).toISOString(),
          })
          .eq("id", conn.id);
        if (tokenError) {
          throw new Error(`token persist failed: ${tokenError.message}`);
        }
      }

      // Step 4f: store the reading, if one was produced.
      if (result.status === "reading") {
        const { error: insertError } = await supabase
          .from("hrv_readings")
          .insert(result.reading);
        if (insertError) {
          throw new Error(`reading insert failed: ${insertError.message}`);
        }
        readings += 1;
      }

      // Step 4g: an auth-related error flips the connection to needs_reauth.
      if (result.status === "error") {
        await supabase
          .from("hrv_wearable_connections")
          .update({ status: "needs_reauth" })
          .eq("id", conn.id);
        continue;
      }

      // Step 4h: a non-error outcome stamps last_synced_at.
      await supabase
        .from("hrv_wearable_connections")
        .update({ last_synced_at: now.toISOString() })
        .eq("id", conn.id);
    } catch (error) {
      // One connection's failure must not abort the rest of the batch.
      console.error(
        `[cron/hrv-wearable-sync] connection ${conn.id} failed:`,
        error,
      );
    }
  }

  // --- Step 5: batch summary. ---
  return NextResponse.json({ ok: true, processed: rows.length, readings });
}
