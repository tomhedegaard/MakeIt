/**
 * How far a magnetic button moves toward the pointer: a share of the
 * distance from the button's centre, capped so a large button never
 * travels further than a small one would. Whole pixels, so the label
 * never renders blurred on a half pixel.
 */
export function magnetOffset(
  pointerX: number,
  pointerY: number,
  box: { left: number; top: number; width: number; height: number },
  strength = 0.3,
  max = 12,
): { x: number; y: number } {
  const cx = box.left + box.width / 2;
  const cy = box.top + box.height / 2;
  // `|| 0` folds -0 into 0, so a centred pointer reads as no offset.
  const clamp = (v: number) => Math.round(Math.max(-max, Math.min(max, v))) || 0;
  return { x: clamp((pointerX - cx) * strength), y: clamp((pointerY - cy) * strength) };
}
