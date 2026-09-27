/**
 * 18-årsgrænsen (Toms beslutning 27.09.2026; vilkårene afsnit "Alder").
 *
 * HQ behandler helbredsoplysninger (træning, søvn, HRV, mental sundhed,
 * og senere kalorier og kropsvægt), så en ny konto kræver, at man
 * bekræfter at være fyldt 18. Bekræftelsen gemmes som et tidsstempel i
 * brugerens metadata (`adult_confirmed_at`), så det kan dokumenteres,
 * hvornår og at den blev givet.
 *
 * En yngre målgruppe får sit eget produkt med forældresamtykke
 * ("MakeIt Ung"), ikke en undtagelse her.
 */

/** Name of the checkbox on every signup form. */
export const ADULT_FIELD = "adult";

/** Cookie that carries the confirmation across the OAuth round-trip. */
export const PENDING_ADULT_COOKIE = "mi_pending_adult";

/** True when the signup form's "Jeg er fyldt 18 år" box was ticked. */
export function confirmsAdult(formData: Pick<FormData, "get">): boolean {
  return formData.get(ADULT_FIELD) === "on";
}

/** The user metadata that records the confirmation. */
export function adultMetadata(now: Date = new Date()): { adult_confirmed_at: string } {
  return { adult_confirmed_at: now.toISOString() };
}

/** Whether a user already has a recorded confirmation. */
export function hasAdultConfirmation(meta: Record<string, unknown> | null | undefined): boolean {
  return typeof meta?.adult_confirmed_at === "string" && meta.adult_confirmed_at.length > 0;
}
