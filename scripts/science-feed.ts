#!/usr/bin/env -S npx tsx
/**
 * scripts/science-feed.ts
 *
 * CLI runner for the daily Science pipeline — the same core the Vercel Cron
 * route (/api/cron/science-feed) runs. Use it for manual runs, the dry-run
 * calibration phase, and the optional GitHub Action (brief §5, Mønster A).
 *
 * Usage:
 *   npm run science:feed:dry      # offline fixture, compute + log, NO writes
 *   npm run science:feed          # LIVE Europe PMC, upsert to Supabase
 *   npx tsx scripts/science-feed.ts --fixture          # live=false, still writes
 *   npx tsx scripts/science-feed.ts --dry-run          # live, no writes
 *
 * Env (for non-dry runs that persist):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (required)
 *   ANTHROPIC_API_KEY                                     (optional — without
 *     it the deterministic template summary is used; the pipeline still runs)
 *
 * Relative imports (not @/ aliases) so it runs under tsx without path-mapping.
 */

import { runScienceFeed } from "../src/lib/science/run";
import { createServiceClient } from "../src/lib/supabase/service";

async function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run") || argv.includes("--dry");
  const live = !argv.includes("--fixture");

  console.log("\n=== MakeIt // Science — daglig pipeline ===");
  console.log(`    mode: ${live ? "LIVE Europe PMC" : "fixture"}${dryRun ? " · DRY-RUN (ingen writes)" : ""}\n`);

  const db = dryRun ? null : createServiceClient();

  const result = await runScienceFeed({
    db,
    live,
    dryRun,
    log: (msg) => console.log(msg),
  });

  console.log(
    `\n✅ Færdig — kilde: ${result.source} · ${result.published.length} published / ${result.rejected.length} rejected\n`,
  );
}

main().catch((err) => {
  console.error(`\n❌ Science-feed fejlede: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
