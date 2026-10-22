# Field usability recovery

## Problems observed
- Field movement can reset when a scene redraw occurs; movement can also appear to reverse or fail when a click route is blocked.
- The player is not told what to do or which button to press during the first minutes.
- Generated portraits are used as clipped faces on hand-drawn stick-like walk sprites; the resulting visual language is inconsistent.

## Acceptance criteria
- Normal field movement preserves the avatar position across harmless state updates and resizes. New game, area transition, load and battle transitions have intentional spawn rules.
- A new player sees the next objective and an actionable control hint, including keyboard and touch instructions.
- A reachable landmark tap produces a clear arrival and interaction; unreachable paths show an explicit message instead of silently resetting.
- Improve the consistency and silhouette of field characters without replacing production battle art.
- Keep v1 save schema, expansion/living sidecars, GitHub Pages path and all existing gameplay.
- Validate real input on desktop and mobile; avoid asserting success until CI is green.

## Implementation notes
- A* never returns the current grid-cell center as a fallback; unreachable routes show a message and do not rewind the player.
- The Phaser scene keeps normalized field coordinates through resize and phase redraws; new-game/load explicitly reset the temporary field position. Route retargeting and manual-key override are supported.
- The cinematic background remains visible above the horizon; a solid, detailed courtyard covers the lower half so field characters stand on a plausible walkable surface rather than in midair.
- Production full-body battle artwork is cropped to its non-transparent silhouette for field rendering, with the original procedural sprites as fallback. This is a presentation improvement, not a complete directional sprite sheet.
- An in-field objective panel, automatic route guidance, controls help and a single large mobile adventure menu reduce the need to guess the next step.
- All new field coordinates and help state are ephemeral; existing v1/sidecar save keys and GitHub Pages URL remain unchanged.

## Follow-up art direction
A future art-focused PR should create consistent four-direction walk-cycle sprite sheets, unique NPC costumes, and location-specific HD-2D ground textures. Static illustrations with a slight sway are not equivalent to true walk animation.
