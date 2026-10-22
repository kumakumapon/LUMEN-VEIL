/** Presentation-only layout: keep illustrated actors inside narrow battlefields. */
export function fitArtwork(sourceWidth: number, sourceHeight: number, maxWidth: number, maxHeight: number): { width: number; height: number } {
  if (![sourceWidth, sourceHeight, maxWidth, maxHeight].every(n => Number.isFinite(n) && n > 0)) throw new RangeError('Artwork dimensions must be positive finite numbers.');
  const scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight);
  return { width: sourceWidth * scale, height: sourceHeight * scale };
}
export function battleArtLayout(width: number, height: number) {
  if (![width, height].every(n => Number.isFinite(n) && n > 0)) throw new RangeError('Battlefield dimensions must be positive finite numbers.');
  return {
    enemy: { x: width * .30, y: height * .81, maxWidth: width * .41, maxHeight: height * .73 },
    heroes: [.66, .79, .91].map((x, i) => ({ x: width * x, y: height * (.82 - (i === 1 ? .035 : 0)), maxWidth: width * .19, maxHeight: Math.min(height * .54, width * .26) })),
  };
}
