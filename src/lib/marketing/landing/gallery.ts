/**
 * How far the horizontal exercise gallery has to travel: the part of
 * the track that does not fit in the stage. Whole pixels, never
 * negative, so a track that fits (a very wide screen) does not pin.
 */
export function galleryTravel(trackWidth: number, stageWidth: number): number {
  return Math.max(0, Math.round(trackWidth - stageWidth));
}

/**
 * Whether the pinned horizontal gallery should run: a wide enough and
 * tall enough viewport, motion allowed, view timelines supported, and
 * something to travel. Anything else keeps the plain wall.
 */
export function galleryEnabled(env: {
  wide: boolean;
  tall: boolean;
  motionOk: boolean;
  viewTimelines: boolean;
}): boolean {
  return env.wide && env.tall && env.motionOk && env.viewTimelines;
}
