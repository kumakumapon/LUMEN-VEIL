# Field Character & Interaction Overhaul

## Reported UX issues
- NPCs are recolored versions of the heroes, so a merchant looks like Rittz and a navigator looks like Noel.
- Field hero illustrations tilt rather than actually walking, with different visual styles across characters.
- Tapping near a landmark sometimes moves, sometimes triggers a scripted interaction, and the game offers little feedback.

## Acceptance criteria
1. All three party heroes use consistent, clearly recognizable directional movement frames; visual fallbacks remain available.
2. Merchant, navigator and scholar have unique field silhouettes, outfits and palettes, no hero sprite re-use.
3. Tapping the ground moves to that spot. Tapping a landmark or NPC marker walks into interaction range and starts dialogue; proximity and E action remain available.
4. Every movement/interaction offers meaningful progress or a clear blocked/arrival hint; clicking while already walking retargets.
5. Accessible menu and keyboard controls stay available; gamepad/touch enhancements must not hide controls.
6. No changes to the version-1 game save envelope, expansion/living sidecars, Pages base URL or battle rules.
7. Verify on desktop and mobile, including real keyboard movement, tap targets, NPC dialogue and save compatibility.

## Visual approach
Use authored stylized field sprite textures in a single HD-2D-inspired palette; do not scale static battle portraits into the field. Keep cinematic portraits for conversation and battle.
