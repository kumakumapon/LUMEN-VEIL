# Visual & Audio Migration — Chapter 0

## Compatibility contract

The v1 save model (`web/model.mjs`) and storage adapter (`web/save.mjs`) remain the source of truth. In particular:

- IndexedDB `lumen-veil-save-v1`, store `slots`, key `chapter-zero`, schema version `1` are unchanged.
- Existing JSON exports and IndexedDB strings still pass through the original strict `parseSave` allowlist before write.
- Renderer positions, particle effects, ATB fill and Web Audio scheduling are **ephemeral**. They are never serialized.
- Stored checkpoints in battle/defeat still load from their preceding safe exploration state.
- GitHub Pages project pathname remains `/LUMEN-VEIL/`; all media is served from `import.meta.env.BASE_URL + 'assets/…'`.

## System diagram

```text
index.html (Vite entry)
  └─ src/main.ts
       ├─ src/world.ts   → Phaser renderer; pointer/touch, WASD walking, visuals
       ├─ src/atb.ts     → WAIT ATB gauge + command-ready input gate
       ├─ src/sound.ts   → Web Audio procedural original BGM + SFX
       └─ web/app.mjs    → DOM controls, narration, event coordination
            ├─ web/model.mjs  → authoritative quest/combat state (unchanged)
            └─ web/save.mjs   → IndexedDB save/JSON import (unchanged)
```

Communication is via local `CustomEvent` messages (`lv:render`, `lv:walk`, `lv:hotspot`, `lv:combat`, `lv:settings`, `lv:sfx`). Phaser is not a persistence dependency; users can interact using the DOM controls if Canvas is blocked.

## Gameplay

- Four existing quest regions. Phaser provides region-specific picture backdrops, animated protagonist+companions, location markers and parallax/floating lights.
- Click/tap the Canvas or hotspot for a character movement animation and interaction. WASD/arrows walk freely within the safe illustration viewport. Travel to other regions still uses the original location transition flags.
- In battle, the ATB bar charges to 100, then WAIT pauses for the player's choice; after each valid action the gauge recharges. No countdown is serialized.
- Attack, arts, echo and guard display tailored light bursts; a break/victory flashes the scene. Damage/stagger/echo calculations are the v1 source of truth.
- Soundtrack is entirely original, generated via Web Audio oscillator envelopes (7 mood motifs plus SFX). This makes BGM/SFX available without licensed audio recordings or external requests. The original volume setting controls both.

## Media

- `public/assets/` keeps WebP environmental visuals and individual character busts as lightweight static files, including crops derived from original concept art generated for this project.
- Text is rendered by DOM/Canvas; the text embedded in draft concept boards is NOT used as an interactive HUD.
- Failure to load media uses the fallback landscape/CSS and procedural sprite textures.

## Quality gates

- Node unit tests verify unchanged combat rules plus historical v1 JSON and database identity.
- `npm run build` typechecks TS, bundles Vite, checks output includes Pages-path-safe resources.
- Playwright E2E covers complete Chapter 0 and old IndexedDB data, bad JSON rejection, mobile viewport and visual canvas availability.
- Pages deployment remains only after `main` push and after E2E succeeds; PR validation never attempts deployment.

## Deliberate limits

Walk positions and ATB are not new save fields. Enemy actions still occur by the deterministic original turn counter. Future real-time ATB and collision tilemaps should be introduced behind separate gameplay versioning/migrations rather than silently changing v1 saves.
