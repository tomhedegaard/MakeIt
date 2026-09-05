/**
 * Member Start Program — privileged write after auth.
 *
 * The cookie client is only used by the action for
 * `canMemberAssignProgram` + active no-op. Materialize + assignment
 * flip run here on the service-role client so a 10-week catalog
 * (PWR-10 = 40 sessions + exercises + sets) cannot time out or
 * fail silently under RLS / PostgREST user-scoped limits.
 *
 * `memberId` must be `getSession().id`. Never a client-supplied id.
 *
 * Week 1 only. Remaining weeks are generated later by
 * `maybeAdvanceWeek` from completed sessions. Coach assign still
 * materializes all remaining weeks via `assignProgramFromBlueprint`
 * (user/coach client) and may chunk later if that path grows.
 */
import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import {
  MEMBER_SELF_SERVE_THROUGH_WEEK,
  assignProgramFromBlueprint,
  type AssignFromBlueprintResult,
} from "@/lib/programs/assign-from-blueprint";

export async function assignProgramForAuthenticatedMember(input: {
  memberId: string;
  programId: string;
}): Promise<AssignFromBlueprintResult> {
  const svc = createServiceClient();
  return assignProgramFromBlueprint(svc, {
    memberId: input.memberId,
    programId: input.programId,
    startWeek: 1,
    throughWeek: MEMBER_SELF_SERVE_THROUGH_WEEK,
    supersedeStatus: "paused",
  });
}
