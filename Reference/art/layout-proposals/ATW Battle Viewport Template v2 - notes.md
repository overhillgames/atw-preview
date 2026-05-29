# ATW Battle Viewport Template v2 Notes

File: `ATW Battle Viewport Template v2 - 630x860.aseprite`

## Terminology

- Logical Gameplay Viewport: `420 x 760`
- Safe Area: the same `420 x 760` gameplay-critical rectangle in this draft.
- Bleed Area: decorative space outside the Safe Area.
- Full artboard: `630 x 860`

## Why This Draft Exists

The previous `630 x 1140` template had `190px` of top bleed and `190px` of bottom bleed. In the Pixi layout pass, that made squat portrait screens feel like they were wasting too much space.

This draft keeps horizontal bleed generous and makes vertical bleed minimal:

- left bleed: `105px`
- right bleed: `105px`
- top bleed: `50px`
- bottom bleed: `50px`

The goal is to let the game fill more of the player's screen with gameplay assets while still leaving decorative art outside the guaranteed Safe Area.

## Layout Changes

- Battlefield: `400 x 570`, at Safe Area `x=10 y=20`
- Tower dock: `400 x 88`, at Safe Area `x=10 y=605`
- Creep dock: `400 x 74`, at Safe Area `x=10 y=701`
- Tower card frames: `74 x 78`
- Creep card frames: `74 x 64`

The tower cards are taller than the creep cards on purpose. This gives tower art more visual presence without making the five-card row wider.

## Glossary Suggestions

Consider adding these terms to `Reference/docs/Art Term Glossary.txt`:

- Full Artboard: The complete source canvas exported by the artist, including Safe Area and Bleed Area.
- Device Fill Area: The part of the player's actual screen the game tries to cover with the largest possible scaled view.
- Letterbox / Pillarbox: Empty or decorative space left over when the Logical Gameplay Viewport does not match the device's aspect ratio.

