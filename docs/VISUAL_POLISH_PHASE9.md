# Visual polish and first-time experience — Phase 9

## Motivation
PR #14 added anime-style NPC portraits and cinematic dialogue, but the game still has a hard horizon between painterly scenery and a synthetic stone grid, and players can miss the initial interaction cues. Portraits, sprite sheets, environment and UI need shared lighting and more expressive transitions.

## Deliverables
- Blend skyline and walkable paving with soft atmospheric color, area-dependent tint, and more coherent character contact lighting; preserve navigation geometry.
- Give field sprites and portraits the same per-area illumination (teal/amber/indigo), without replacing 4-direction walk cycles with static cutouts.
- Context-sensitive dialogue presentation: mood lighting, character entrance/exit, camera-focus cue and gentle scene-dependent original SFX, with keyboard and reduced-motion parity. No claim of new painted facial-expression sprites where no such assets exist.
- In-world first-minute instructions that change with the objective and can be dismissed; keep the existing accessible route/help controls.
- Automated tests for hint progression, dialogue mood classification, viewport geometry, save-resume, and all existing chapter-zero flows.

## Constraints
- Do not modify `web/model.mjs`, `web/save.mjs`, expansion/living sidecars, IndexedDB keys, battle mechanics or Pages base path.
- Keep the art fallback chain (anime AVIF → WebP → SVG), audio muted when volume is zero, and animations disabled by reduced-motion.
- Treat screenshot reviews and real play tests as separate from compilation success.
