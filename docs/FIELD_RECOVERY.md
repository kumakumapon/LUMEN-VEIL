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
