/**
 * Whether a marketing MoveKit loop should be playing right now. Pure so
 * the play policy is testable without a DOM: only in view, only once
 * the video can play, never against a user pause. Reduced motion keeps
 * the loop still on its own — but an explicit tap on the play control
 * (`userRequested`) outranks that passive preference, so a visitor who
 * asks for the clip always gets it.
 */
export function shouldPlay(s: {
  inView: boolean;
  reducedMotion: boolean;
  userPaused: boolean;
  ready: boolean;
  /** The visitor pressed play. Only a real gesture sets this. */
  userRequested?: boolean;
}): boolean {
  if (!s.inView || !s.ready || s.userPaused) return false;
  // Scroll-triggered autoplay stays off under reduced motion; a tap wins.
  return !s.reducedMotion || s.userRequested === true;
}
