# ATW Battle Viewport Template v4 Notes

File: `ATW Battle Viewport Template v4 - 1260x1000.aseprite`

## Geometry

- Full artboard: `1260 x 1000`
- Safe gameplay screen: `420 x 760`
- Safe screen position: `x=420 y=180`
- Bleed:
  - left: `420px`
  - right: `420px`
  - top: `180px`
  - bottom: `60px`

## Source Relationship

This file was expanded from `ATW Battle Viewport Template v3 - 630x860.aseprite`.

- Existing non-bleed cels were shifted by `x=315 y=130`.
- Existing safe-screen content keeps its relative layout.
- The `bleed_area` layer was replaced with a larger plain white fill outside the new safe screen.

## Why This Draft Exists

The v3 `630 x 860` template worked well for phone-first gameplay but did not provide enough horizontal decorative bleed for tablets, and it only allowed `50px` of top bleed. This v4 canvas keeps a single source template while giving:

- enough side bleed for tablet and landscape compositions,
- more top bleed for phone crops,
- minimal bottom bleed so the gameplay screen can sit lower on tall phones.

Gameplay-critical content still belongs inside the `420 x 760` safe screen. Bleed is decorative and may be cropped differently per device.
