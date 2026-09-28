import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/auth";
import { COMPANY } from "@/lib/company";
import { fetchMemberExport } from "@/lib/data/export";
import { buildExportPayload } from "@/lib/privacy/export";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GDPR Art. 20 — data portability. Returns a JSON file with the
 * member-owned rows the authenticated caller can read under RLS.
 * Demo mode returns the same shape with empty collections and an
 * honest note — it must not crash.
 *
 * Never uses the service-role client.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Auth" }, { status: 401 });

  const t = await getTranslations("Settings.data");
  const exportedAt = new Date().toISOString();
  const filename = `makeit-hq-export-${session.id.slice(0, 8)}.json`;

  if (!SUPABASE_ENABLED) {
    const payload = buildExportPayload({
      exportedAt,
      mode: "demo",
      note: t("exportNoteDemo"),
      member: null,
    });
    return exportFile(payload, filename);
  }

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Auth" }, { status: 401 });

  const { member, collections, omitted } = await fetchMemberExport(
    supabase,
    session.id,
  );

  let note = t("exportNoteConnected", {
    product: COMPANY.product,
    email: COMPANY.emails.support,
  });
  if (omitted.length > 0) {
    note = `${note} ${t("exportOmitted", { tables: omitted.join(", ") })}`;
  }

  const payload = buildExportPayload({
    exportedAt,
    mode: "connected",
    note,
    member,
    collections,
    omitted,
  });
  return exportFile(payload, filename);
}

function exportFile(payload: unknown, filename: string) {
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
