# Issue #17 implementation and QA

## Implemented

- Dedicated original market and observatory paintings, without people or text.
- Six original painted 16-frame walking sheets, with shared per-sheet scale and
  bottom-center foot anchor. Existing direction/frame API is retained.
- Four actual facial-expression images for each of six characters. Dialogue mood
  selects calm, joy, worry, or surprise; Enter, Space and Escape remain available.
- WebP → SVG → Canvas walking fallback; AVIF → WebP → original portrait fallback.
  Completely unavailable portraits are hidden, while dialogue text stays usable.
- Softer paving contrast, larger NPCs, matching contact shadows and area lighting.
- Phaser and world rendering load on game start, rather than on the title screen.
- OS reduced-motion preference also applies to Phaser field animation.
- README now reflects implemented collision-aware navigation.

## Verification

- `npm test`: 35 tests, including original model/save compatibility, finite image
  fallback chains, expression selection, audio mute and hidden-tab suspension.
- `npm run build`: type checking, production bundling and Pages subpath/assets checks.
- `python tests/art-assets.py`: six 1024×1536 transparent atlases; all 96 frame
  boundaries and foot baselines; 24 expression pairs; dimensions and byte budgets.
- `tests/e2e.py`: actual keyboard movement/facing, guided exploration, NPC dialogue,
  quests/shop/equipment, save/reload, fights, ending, JSON export, old IndexedDB save,
  invalid-import recovery, touch exploration and mobile save/resume.
- Screenshot matrix: 320/390/768/1440px × six areas, dialogue, battle and equipment
  menu. Existing field/control geometry checks are retained. Screenshots are saved
  in `screenshots/` and uploaded by the existing CI artifact step.
- `scripts/compare-screenshots.py BASELINE CURRENT OUT` produces pixel differences
  and a JSON report for subsequent art reviews. Effects and patrol motion require
  visual interpretation; compilation alone does not establish visual quality.

Visual review found excessive paving contrast; this was reduced. Dedicated scene
paintings are vertically framed so market canopies and the observatory telescope
remain visible above the foreground. Dialogue portrait, text and next/close buttons
fit the narrow layout. Full-page mobile captures include vertical scrolling.

## Asset and runtime budget

Six WebP walking sheets total 1,869,548 bytes; decoded RGBA textures use 36 MiB.
All 24 AVIF expressions total 518,354 bytes, and only the requested face is fetched.
The title entry script is about 9 KB before gzip after deferring Phaser. Phaser's
separate bundle still triggers Vite's large-chunk warning. These are local build
measurements, not measured real-device FPS or mobile network timings.

## PR #15 decision

The current main workflow run 40034769795 completed `test-build`, `e2e`, and
`deploy` successfully, including Playwright's browser/dependency installation.
The HTTP APT failure is not reproduced by this evidence. Do not add #15's system
APT rewriting to the game changes without a failing runner log. Recommendation:
close #15 as unnecessary for the current runner, retaining its history if the
problem recurs. This implementation does not merge or close remote pull requests.

## Deliberately separate roadmap

Keep the existing original Web Audio score; file-based music is optional and has
not been introduced. Six full chapters, cloud synchronization, real-time enemy ATB,
and full 3D remain future gameplay work. Tests use desktop Chromium and mobile
emulation; physical iOS/Android devices and remote Actions for this unpushed change
have not been tested.
