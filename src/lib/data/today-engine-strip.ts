/**
 * Today WHY strip — live composer.
 *
 * Demo (`!SUPABASE_ENABLED`) uses the labeled fixture Munk demos on.
 * Connected mode reads the existing adaptive engine input. No new
 * backend: if the Motor has nothing to read, the strip stays empty.
 */

import {
  buildEngineStrip,
  demoEngineStrip,
  type EngineStripModel,
} from "@/lib/adaptive/engine-strip";
import { buildEngineInput } from "@/lib/adaptive/data";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";

export async function getTodayEngineStrip(
  memberId: string,
): Promise<EngineStripModel> {
  if (!SUPABASE_ENABLED) return demoEngineStrip();

  const supabase = await createClient();
  if (!supabase) return { steps: [], munkNote: "" };

  try {
    const input = await buildEngineInput(supabase, memberId, new Date());
    if (!input) return { steps: [], munkNote: "" };
    return buildEngineStrip(input);
  } catch (err) {
    console.warn("[dashboard] engine strip skipped", err);
    return { steps: [], munkNote: "" };
  }
}
