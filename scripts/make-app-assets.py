#!/usr/bin/env python3
"""App icon and splash art for the native shells (spec D3).

Both were flat #0A0A0B placeholders with no mark on them. The brand's
most recognisable element is the double slash in the MAKEIT // HQ
wordmark, and two slanted bars stay legible at 48 px, so that is the
icon: ink ground, one bar in Kalk chalk and one in the signal orange
that the design system reserves for graphics.

Every existing PNG is rewritten at its own size, so no format, density
or filename is invented here; run `npx cap sync` afterwards.

    python3 scripts/make-app-assets.py [--check]

--check reports what would change without writing.
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw

# Kalk tokens (src/app/globals.css)
INK = (13, 15, 18)
CHALK = (231, 233, 235)
NAT = (10, 10, 11)
SIGNAL = (228, 87, 15)

ROOT = Path(__file__).resolve().parent.parent
IOS = ROOT / "ios/App/App/Assets.xcassets"
ANDROID = ROOT / "android/app/src/main/res"

# The mark, as fractions of its own height: bar thickness, the gap
# between the two bars, and how far the top leans past the bottom.
THICK = 0.26
GAP = 0.30
LEAN = 0.42


def draw_mark(img: Image.Image, colors: tuple[tuple[int, int, int], tuple[int, int, int]], height: float) -> None:
    """Two leaning bars, centred on the image."""
    d = ImageDraw.Draw(img)
    t = height * THICK
    lean = height * LEAN
    width = 2 * t + height * GAP + lean
    cx, cy = img.width / 2, img.height / 2
    x = cx - width / 2
    top, bottom = cy - height / 2, cy + height / 2
    for color in colors:
        d.polygon(
            [(x + lean, top), (x + lean + t, top), (x + t, bottom), (x, bottom)],
            fill=color,
        )
        x += t + height * GAP


def mark(size: tuple[int, int], bg: tuple[int, int, int] | None, colors, share: float) -> Image.Image:
    img = Image.new("RGBA", size, (*bg, 255) if bg else (0, 0, 0, 0))
    draw_mark(img, colors, min(size) * share)
    return img


def rounded(img: Image.Image) -> Image.Image:
    """Circular crop for Android's round launcher icon."""
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).ellipse((0, 0, img.width - 1, img.height - 1), fill=255)
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.paste(img, mask=mask)
    return out


def targets() -> list[tuple[Path, str]]:
    """Every asset we rewrite, paired with the recipe to use for it."""
    out: list[tuple[Path, str]] = []
    for p in sorted(IOS.glob("Splash.imageset/*.png")):
        out.append((p, "splash-dark" if "dark" in p.name else "splash"))
    for p in sorted(IOS.glob("AppIcon.appiconset/*.png")):
        out.append((p, "icon"))
    for p in sorted(ANDROID.glob("drawable*/splash.png")):
        out.append((p, "splash-dark" if "night" in p.parent.name else "splash"))
    for p in sorted(ANDROID.glob("mipmap-*/*.png")):
        if p.name == "ic_launcher_background.png":
            out.append((p, "adaptive-bg"))
        elif p.name == "ic_launcher_foreground.png":
            out.append((p, "adaptive-fg"))
        elif p.name == "ic_launcher_round.png":
            out.append((p, "icon-round"))
        elif p.name == "ic_launcher.png":
            out.append((p, "icon"))
    return out


def render(recipe: str, size: tuple[int, int]) -> Image.Image:
    if recipe == "splash":
        return mark(size, CHALK, (INK, SIGNAL), 0.22)
    if recipe == "splash-dark":
        return mark(size, NAT, (CHALK, SIGNAL), 0.22)
    if recipe == "icon":
        return mark(size, INK, (CHALK, SIGNAL), 0.46)
    if recipe == "icon-round":
        return rounded(mark(size, INK, (CHALK, SIGNAL), 0.46))
    if recipe == "adaptive-bg":
        return Image.new("RGBA", size, (*INK, 255))
    if recipe == "adaptive-fg":
        # Adaptive icons crop to the middle ~66 %, so the mark sits small.
        return mark(size, None, (CHALK, SIGNAL), 0.30)
    raise ValueError(recipe)


def main() -> int:
    check = "--check" in sys.argv
    files = targets()
    if not files:
        print("No native assets found; run npx cap add ios/android first.")
        return 1
    for path, recipe in files:
        with Image.open(path) as im:
            size = im.size
        if check:
            print(f"{recipe:12} {size[0]:>5}×{size[1]:<5} {path.relative_to(ROOT)}")
            continue
        render(recipe, size).save(path)
    print(f"{'Would rewrite' if check else 'Rewrote'} {len(files)} assets")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
