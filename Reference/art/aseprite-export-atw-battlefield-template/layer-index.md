# ATW Battlefield Template Layer Export

Source: `C:\Users\bmaga\Dropbox\Overhill\Asset Dump\ATW Battlefield Template with Bleed 630x1140.aseprite`

Canvas: `630 x 1140`

Export behavior:
- Each PNG preserves the full source canvas size.
- Transparent empty space is intentionally retained so coordinates stay stable.
- `zIndex` is zero-based and follows the Aseprite layer collection order exported by the file. Lower indices are intended to be lower/back layers for the future PixiJS stack.
- The saved file visibility state had only `creep_card_frames` visible. All listed layers were still exported one at a time.

| zIndex | Layer | PNG |
| ---: | --- | --- |
| 0 | `bleed_area` | `00_bleed_area.png` |
| 1 | `safe_area` | `01_safe_area.png` |
| 2 | `battlefield` | `02_battlefield.png` |
| 3 | `creep_dock` | `03_creep_dock.png` |
| 4 | `tower_dock` | `04_tower_dock.png` |
| 5 | `timer_round_panel` | `05_timer_round_panel.png` |
| 6 | `timer_round_containers` | `06_timer_round_containers.png` |
| 7 | `score_mana_panel` | `07_score_mana_panel.png` |
| 8 | `score_mana_containers` | `08_score_mana_containers.png` |
| 9 | `tower_card_frames` | `09_tower_card_frames.png` |
| 10 | `tower_sprites` | `10_tower_sprites.png` |
| 11 | `creep_card_frames` | `11_creep_card_frames.png` |
| 12 | `creep_sprites` | `12_creep_sprites.png` |
| 13 | `battlefield_tower_positions` | `13_battlefield_tower_positions.png` |

