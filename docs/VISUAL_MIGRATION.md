# Visual & Audio Migration Plan (work in progress)

## Non-negotiable compatibility guarantees

- Keep the **v1** save envelope, the IndexedDB database name/store/key, and the existing `validateSave` allowlist logic compatible. Migration must not reset a saved user's progress or their settings.
- Keep the static GitHub Pages URL at `/LUMEN-VEIL/`, including every dynamic import and media URL; no server-only APIs and no credentials in the bundle.
- Preserve the complete Chapter 0 route, combat actions, journal, retry, keyboard and touchscreen functionality.

## Implementation

1. Migrate the build and source entrypoint to Vite + TypeScript; use Phaser for animated scene rendering while keeping accessible DOM controls.
2. Implement keyboard/touch map walking and transitions without changing the scene/flag save semantics.
3. Add visibly filling WAIT ATB gauges, anticipation/break/echo effects; retain deterministic actions and saved checkpoints.
4. Add optimized, original environment/character art; provide fallback images for failed loads.
5. Add original BGM/SFX using Web Audio, gated on user gesture, with volume and visibility handling.

## Acceptance / regression

- Legacy fixtures for both fresh and progressed v1 saves import and resume unchanged.
- `npm test`, `npm run build`, and Playwright E2E pass in CI on desktop/mobile and on the actual GitHub Pages project subpath.
- CI only deploys after main merge; preview builds must not perform Pages deployment.
- Document any intentional scope limits, engine fallbacks and asset licenses.
