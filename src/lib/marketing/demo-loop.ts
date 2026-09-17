/**
 * Whether a marketing MoveKit loop should be playing right now. Pure so
 * the play policy is testable without a DOM: only in view, only once
 * the video can play, never against reduced motion or a user pause.
 */
export function shouldPlay(s: {
  inView: boolean;
  reducedMotion: boolean;
  userPaused: boolean;
  ready: boolean;
}): boolean {
  return s.inView && s.ready && !s.reducedMotion && !s.userPaused;
}
