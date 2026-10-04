#!/usr/bin/env python3
"""Nord type-scale codemod (bølge 1, 2026-10-04).

Rewrites raw Tailwind font sizes on member + coach surfaces to the Nord
scale in globals.css (spec §4, DESIGN.md). Responsive/state variants are
kept (md:text-2xl -> md:text-section). Marketing has its own scale and is
skipped. Run with --dry to print the mapping counts only.

text-sm is the one judgement call: secondary text (fg-dim/faint, eyebrow,
buttons, chips, labels) becomes meta (13); everything else is body copy (15).
"""
import re, sys, pathlib, collections

ROOTS = ["src/app/(app)", "src/app/coach", "src/app/onboarding", "src/app/login", "src/components"]
SKIP = re.compile(r"(/marketing/|\.test\.|/landing/)")

def px(v):
    n = float(re.sub(r"(px|rem)$", "", v))
    return n * 16 if v.endswith("rem") else n

def scale_for_px(p):
    if p <= 12.5: return "micro"
    if p <= 14: return "meta"
    if p <= 16: return "copy"
    if p <= 19: return "card"
    if p <= 27: return "section"
    if p <= 48: return "title"
    return "hero"

FIXED = {"xs": "micro", "base": "copy", "lg": "card", "xl": "section", "2xl": "section",
         "3xl": "title", "4xl": "title", "5xl": "hero", "6xl": "hero", "7xl": "hero", "8xl": "hero", "9xl": "hero"}
SECONDARY = re.compile(r"text-fg-(dim|faint)|eyebrow|\bbtn\b|chip|pill|badge|label|<label|<dt|<th|caption|helper|hint|meta")

TOKEN = re.compile(r"(?<![\w-])((?:[a-z0-9-]+:)*)text-(xs|sm|base|lg|xl|[2-9]xl|\[[\d.]+(?:px|rem)\])(?![\w\-\[])")

def rewrite_line(line, stats):
    def sub(m):
        variants, size = m.group(1), m.group(2)
        if size == "sm":
            new = "meta" if SECONDARY.search(line) else "copy"
        elif size.startswith("["):
            new = scale_for_px(px(size[1:-1]))
        else:
            new = FIXED[size]
        stats[f"text-{size} -> text-{new}"] += 1
        return f"{variants}text-{new}"
    return TOKEN.sub(sub, line)

def main():
    dry = "--dry" in sys.argv
    stats, files = collections.Counter(), 0
    for root in ROOTS:
        for p in pathlib.Path(root).rglob("*.ts*"):
            s = str(p)
            if SKIP.search(s):
                continue
            src = p.read_text()
            out = "\n".join(rewrite_line(l, stats) for l in src.split("\n"))
            if out != src:
                files += 1
                if not dry:
                    p.write_text(out)
    for k, v in sorted(stats.items(), key=lambda kv: -kv[1]):
        print(f"{v:5} {k}")
    print(f"{sum(stats.values())} rewrites in {files} files{' (dry run)' if dry else ''}")

if __name__ == "__main__":
    main()
