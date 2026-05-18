import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * HRV weekly-insights cron — STUB.
 *
 * Real logic (aggregating each member's week of HRV data into an insights
 * summary) ships in a later phase. For now this only verifies the Vercel
 * Cron bearer secret and acknowledges the invocation.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    phase: "stub",
    job: "hrv-weekly-insights",
  });
}
