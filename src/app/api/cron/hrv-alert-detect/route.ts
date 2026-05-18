import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * HRV alert-detection cron — STUB.
 *
 * Real logic (scanning recent readings for readiness drops and dispatching
 * alerts) ships in a later phase. For now this only verifies the Vercel
 * Cron bearer secret and acknowledges the invocation.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  return NextResponse.json({ ok: true, phase: "stub", job: "hrv-alert-detect" });
}
