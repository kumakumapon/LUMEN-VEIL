# Anime Art & Dialogue Cinematics — Phase 8

## Purpose
Unify the previously mixed vector field art, static portrait UI and skyline backgrounds into one luminous fantasy-anime aesthetic. Use generated art as **production assets**, never paste a UI mockup into the game.

## Deliverables
1. Reuse the existing anime-style hero portraits; replace the three NPC conversation portraits with a compact WebP atlas cropped from generated concept art, while keeping their SVG fallbacks.
2. Preserve existing scene paintings but apply a common painterly light direction, dusk-blue / gold / teal color grading, and area-specific atmosphere. Do not use a poster or UI montage as a field background.
3. Dialogue cinematics: large responsive character portrait, readable speaker name and text, progress indicator, keyboard Enter/Space to advance, Escape to close, reduced-motion support, no double-advance from holding a key.
4. Maintain the actual four-direction walking atlas; do not replace a functioning 16-frame walk cycle with a static poster cutout.
5. Preserve game model, v1 save/sidecars, IndexedDB, GitHub Pages `/LUMEN-VEIL/` and battle logic.

## Verification
- The generated 192×84 WebP NPC atlas loads under the Pages subpath and falls back to the existing individual SVG portraits on errors. The compact atlas is a first-pass portrait asset, not final high-resolution painted art.
- Existing PC/mobile end-to-end story, keyboard movement, save-resume and battle tests pass.
- Portraits match speakers; dialogue can advance and close by mouse/touch/keyboard.
- Capture title, field and dialogue screenshots for visual review.

## Follow-up art production
Replace the compact NPC atlas with separately painted high-resolution portraits and replace the SVG walk sheets only when coherent 16-frame anime walk cycles are available. Keep the same presentation and fallback contracts.
