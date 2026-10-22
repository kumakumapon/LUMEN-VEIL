# Field HUD collision recovery

## Problem
The exploration view positions objective, controls, narrative and status independently over the canvas. On mobile the 108px-tall quest panel, 105px-from-bottom controls, area heading and narrative overlap each other and obscure the player. The top toolbar adds another layer of confusion.

## Layout contract
- The field is a dedicated canvas region. Do not put interactive menus over the playable map.
- Below it, place a clearly separated objective card, contextual action controls, and narrative text in document flow.
- Desktop uses a two-column control dock; mobile uses a stacked control dock.
- Battle layout stays intact. The objective and contextual controls must be hidden in battle.
- Use safe-area insets and a 44px minimum touch target.
- Do not change the game model, v1/sidecar saves, IndexedDB keys, Pages base path, or battle rules.

## Verification
- Browser-based geometry assertions at 390x844, 320x640, 768x1024, 1440x900: quest panel, buttons, dialogue, canvas and header must not overlap each other; no horizontal overflow.
- Keyboard/tap movement, E interaction, next-objective routing, menus, legacy save import and chapter completion continue to pass.
- Model tests, TypeScript build and Pages E2E remain green.
