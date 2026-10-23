# Anime Art & Dialogue Cinematics — Phase 8

## Purpose
Unify the previously mixed vector field art, static portrait UI and skyline backgrounds into one luminous fantasy-anime aesthetic. Use generated art as **production assets**, never paste a UI mockup into the game.

## Deliverables
1. Original anime-style portrait artwork for Noel, Sena, Ritz, merchant Yui, navigator and scholar El, cropped into individual files; keep SVG/WebP fallbacks.
2. New painterly scenery for the field (without characters, text or UI baked into the scene); use area-specific variants with a shared dusk-blue / gold / teal palette.
3. Dialogue cinematics: large responsive character portrait, readable speaker name and text, progress indicator, keyboard Enter/Space to advance, Escape to close, reduced-motion support, no double-advance from holding a key.
4. Maintain the actual four-direction walking atlas; do not replace a functioning 16-frame walk cycle with a static poster cutout.
5. Preserve game model, v1 save/sidecars, IndexedDB, GitHub Pages `/LUMEN-VEIL/` and battle logic.

## Verification
- New images load under the Pages subpath, fall back on errors, and do not obscure walkable geometry.
- Existing PC/mobile end-to-end story, keyboard movement, save-resume and battle tests pass.
- Portraits match speakers; dialogue can advance and close by mouse/touch/keyboard.
- Capture title, field and dialogue screenshots for visual review.
