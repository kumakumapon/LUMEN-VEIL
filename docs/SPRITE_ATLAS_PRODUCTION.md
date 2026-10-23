# HD-2D field sprite atlas production

## Scope
- Replace runtime-only Canvas figures with six independently authored, resolution-independent SVG **4-direction × 4-frame sprite sheets** (one atlas per actor, 16 poses each).
- Each atlas is 4 columns × 4 rows of 256×384 artwork, rasterized by Phaser at 1024×1536; source SVG is retained for editable art iteration.
- Noel, Sena, Ritz, merchant Yui, navigator, and scholar each have their own costume, face, hair, accessory, palette and walking motion.
- Keep the prior Canvas generator as a **fallback only** for a failed atlas load; never block the game when one sheet fails.
- Preserve field position, input, quests, combat, dialogue portraits, save v1/sidecars, and GitHub Pages base path.

## Quality and acceptance
- No character art baked into backgrounds, no baked UI or text inside the atlas.
- Frames align at feet and consistent origin to avoid hopping on animation changes.
- Real movement changes facing/frame; idle stops at frame zero, reduced-motion respects idle.
- Tests verify six valid 4×4 sheets, asset references, browser sprite resolution, and full desktop/mobile story path.
- Confirm GitHub Actions green before marking the PR ready.

## Limitations
These are authored scalable vector sprites, **not** image-model-produced painterly sprite sheets. A future art pass can replace the SVG atlas sources with hand-painted WebP/PNG atlases without changing the frame API.
