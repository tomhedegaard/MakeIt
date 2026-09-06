/**
 * MakeIt brand figure v3B — custom editorial silhouette.
 *
 * Drop-in on viewBox 0 0 724 1448 so v3A.2 organ glyphs and the
 * AnatomyFigure PARTS kinetic chain keep their locked coordinates.
 * AnatomyFigure / PARTS themselves are not modified.
 *
 * Craft attempt (not illustrator-final): androgynous, faceless,
 * articulated hands/feet, athletic editorial — not the library
 * highlighter, not a medical poster. Remaining gaps are listed
 * in docs/briefs/figure-v3b/README.md.
 */

export const V3B_VIEWBOX = "0 0 724 1448" as const;

/** Midline — same as the library figure so organs stay put. */
export const V3B_CX = 362;

/**
 * Custom charcoal outline. Clockwise from the crown: left head →
 * left hand (fingers + thumb) → left foot → crotch → mirrored right.
 * Absolute C so tests can lock that this is not OUTLINES.male.front.
 *
 * Envelope stays close to the library figure (shoulders ~176–548,
 * crotch ~754, feet ~1364) so PARTS sit inside the fill.
 */
export const V3B_OUTLINE = [
  // Crown → left skull → jaw (egg, faceless)
  "M362 150",
  "C328 150 304 168 298 198",
  "C292 226 300 248 316 262",
  "C326 270 334 276 340 286",
  // Neck, then sloping trap / rounded deltoid
  "C342 296 336 304 314 310",
  "C278 318 236 324 198 338",
  "C176 348 166 368 164 392",
  // Left arm outer — thick enough for biceps / forearm PARTS
  "C156 430 148 470 140 510",
  "C132 550 122 590 112 626",
  "C100 664 86 690 76 708",
  // Left hand. Long digits, valleys return to the palm.
  "C58 718 40 734 32 754",
  "C26 772 26 792 32 808",
  "C36 818 48 820 54 808",
  "C58 798 60 780 62 764",
  "C52 786 46 812 50 834",
  "C54 846 70 848 76 832",
  "C80 820 82 798 84 780",
  "C76 804 72 832 78 854",
  "C84 868 102 866 108 848",
  "C112 834 112 808 112 788",
  "C110 808 108 830 116 844",
  "C124 856 140 850 142 834",
  "C144 820 140 798 138 780",
  "C150 772 168 762 180 746",
  "C188 734 182 716 168 710",
  "C152 704 136 702 124 694",
  "C116 688 110 678 110 666",
  // Left inner arm — held away from the torso so the limb has width
  "C122 626 136 580 150 534",
  "C162 490 176 446 192 404",
  "C206 368 222 340 242 326",
  "C254 316 266 318 272 330",
  // Left torso: armpit → chest wall → waist cinch → hip
  "C266 374 256 424 248 474",
  "C244 520 256 564 272 604",
  "C280 640 272 682 256 718",
  // Left hip → outer thigh → knee → calf → ankle
  "C240 766 228 828 224 888",
  "C220 948 228 998 238 1038",
  "C248 1078 246 1126 240 1174",
  "C236 1222 242 1262 254 1288",
  // Left foot — heel, arch, ball, four toe hints
  "C238 1314 226 1334 228 1348",
  "C230 1356 240 1362 254 1362",
  "C266 1362 276 1360 284 1356",
  "C290 1358 294 1356 296 1350",
  "C300 1348 304 1348 306 1344",
  "C308 1340 306 1336 302 1332",
  "C294 1326 288 1318 286 1306",
  "C284 1298 286 1290 290 1284",
  // Left inner leg → crotch
  "C296 1236 302 1176 308 1116",
  "C314 1056 320 996 326 936",
  "C332 876 344 816 354 776",
  "C358 764 360 756 362 754",
  // Right inner leg
  "C364 756 366 764 370 776",
  "C380 816 392 876 398 936",
  "C404 996 410 1056 416 1116",
  "C422 1176 428 1236 434 1284",
  // Right foot
  "C438 1290 440 1298 438 1306",
  "C436 1318 430 1326 422 1332",
  "C418 1336 416 1340 418 1344",
  "C420 1348 424 1348 428 1350",
  "C430 1356 434 1358 440 1356",
  "C448 1360 458 1362 470 1362",
  "C484 1362 494 1356 496 1348",
  "C498 1334 486 1314 470 1288",
  // Right outer leg → hip
  "C482 1262 488 1222 484 1174",
  "C478 1126 476 1078 486 1038",
  "C496 998 504 948 500 888",
  "C496 828 484 766 470 718",
  // Right torso: hip → waist cinch → chest wall → armpit
  "C468 682 452 640 452 604",
  "C468 564 480 520 476 474",
  "C468 424 458 374 458 330",
  "C458 318 470 316 482 326",
  "C502 340 518 368 532 404",
  "C548 446 562 490 574 534",
  "C588 580 602 626 614 666",
  // Right hand
  "C614 678 608 688 600 694",
  "C588 702 572 704 556 710",
  "C542 716 536 734 544 746",
  "C556 762 574 772 586 780",
  "C584 798 580 820 582 834",
  "C584 850 600 856 608 844",
  "C616 830 614 808 612 788",
  "C612 808 612 834 616 848",
  "C622 866 640 868 646 854",
  "C652 832 648 804 640 780",
  "C642 798 644 820 648 832",
  "C654 848 670 846 674 834",
  "C678 812 672 786 662 764",
  "C664 780 666 798 670 808",
  "C676 820 688 818 692 808",
  "C698 792 698 772 692 754",
  "C684 734 666 718 648 708",
  // Right arm outer → shoulder → neck → skull → crown
  "C638 690 624 664 612 626",
  "C602 590 592 550 584 510",
  "C576 470 568 430 560 392",
  "C558 368 548 348 526 338",
  "C488 324 446 318 410 310",
  "C388 304 382 296 384 286",
  "C390 276 398 270 408 262",
  "C424 248 432 226 426 198",
  "C420 168 396 150 362 150",
  "Z",
].join(" ");

/**
 * Mind = upper head volume. Clean oval that sits inside V3B_OUTLINE
 * so the library highlighter head is not reused on the brand figure.
 */
export const V3B_HEAD = [
  "M362 168",
  "C328 168 306 188 306 216",
  "C306 242 322 260 342 266",
  "C350 268 374 268 382 266",
  "C402 260 418 242 418 216",
  "C418 188 396 168 362 168",
  "Z",
].join(" ");

export const V3B_HEAD_PATHS = [V3B_HEAD] as const;
