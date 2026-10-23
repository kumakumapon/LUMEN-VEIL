// Original anime illustration crops produced for the game's named NPCs.
// The 3-column WebP atlas has no baked UI or captions; SVGs remain fallbacks.
const NPC_CROPS=Object.freeze([
  {speaker:'商人ユイ',column:0,character:'merchant'},
  {speaker:'航路士',column:1,character:'navigator'},
  {speaker:'星見のエル',column:2,character:'scholar'},
]);
export const NPC_ANIME_ATLAS='portrait-anime-npcs.webp';
export function animePortraitForSpeaker(speaker){
  const match=NPC_CROPS.find(item=>String(speaker||'').includes(item.speaker));
  return match?{file:NPC_ANIME_ATLAS,column:match.column,character:match.character}:null;
}
export function npcAtlasObjectPosition(column){
  return ['0%','50%','100%'][column]??'50%';
}
