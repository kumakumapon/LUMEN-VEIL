# Immersive field UX — Phase 5

The previous exploration view used a persistent grid of hotspot buttons below the canvas, making the experience feel like a choice-based web app rather than a JRPG.

## New default interaction
- The Phaser field is the main gameplay surface; the persistent choice grid is removed from the default exploration layout.
- WASD / arrow keys move; E interacts with the nearest nearby landmark or NPC. Touch users tap field markers or use the context-sensitive **話す・調べる** button.
- A short HUD prompt indicates the nearby NPC/landmark. **周辺を探す** opens an optional accessible landmark list for discoverability and keyboard/screen-reader users; this list is no longer the primary play loop.
- Exploration text and objective/party status become a field overlay. Battles keep their full command layout.

## Compatibility and tests
- Do not alter v1 save, expansion, living-world IndexedDB keys or validation.
- Keep all quest/gear/shop menus, battle commands, retry and journal.
- Preserve Vite GitHub Pages base path and CI.
- E2E verifies default list is not visible, context HUD and optional landmark menu work, plus full chapter zero, mobile and save-resume.
