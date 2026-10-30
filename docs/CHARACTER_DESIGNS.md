# Character design lock — issue #17

Production references are the shipped `portrait-noel.webp`, `portrait-sena.webp`,
`portrait-ritz.webp`, and the three columns of `portrait-anime-npcs.webp`.
These establish identity; the older vector field sprites remain technical fallbacks.
All new imagery is original generated artwork for LUMEN VEIL, not third-party game art.

| Actor | Identity and palette | Field silhouette / accessory |
| --- | --- | --- |
| Noel | Young man, tousled dark brown hair, navy and ivory, aged gold | Short navy cape, ivory tunic, dark boots, sheathed sword |
| Sena | Young woman, silver bob, blue eyes, navy hair ribbon, ivory and pale blue | Ivory blue-trimmed dress, short cape, slim crystal staff |
| Ritz | Young woman, red ponytail, brass goggles, charcoal and leather brown | Mechanic's vest, shorts over leggings, heavy boots, wrench |
| Merchant Yui | Young woman, brown bob, warm brown eyes, burgundy and cream | Burgundy beret and skirt, cream blouse, leather satchel |
| Navigator | Young man, light brown windswept hair, round glasses, teal and gold | Teal travel coat, brown boots, rolled chart |
| Scholar El | Young woman, dark violet hair, violet eyes, indigo and lavender | Indigo hooded cape, lavender dress, closed star book |

## Frame contract

- Each actor: 4 columns × 4 rows; rows down / up / left / right.
- Columns: neutral / left step / passing / right step, created as one sheet.
- Runtime frame size stays 256 × 384; texture frame names stay `down-0` etc.
- All frames share a single scale and bottom-center foot anchor (128, 352).
- Transparent background; no cast shadow, words, scenery, UI or frame borders.
- Prefer a readable, approximately four-head-tall anime silhouette at game scale.
- Expression sheets use the same portrait identity: calm / joy / worry / surprise.
- Generated output must be inspected before shipping; sheet layout and alpha are
  checked independently from subjective art quality.
