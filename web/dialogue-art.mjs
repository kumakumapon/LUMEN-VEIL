import { portraitForSpeaker } from './portrait-map.mjs';
import { animePortraitForSpeaker, npcAtlasObjectPosition } from './anime-portraits.mjs';

export const EXPRESSION_ACTORS = Object.freeze({
  'ノエル':'noel', 'セナ':'sena', 'リッツ':'ritz',
  '商人ユイ':'merchant', '航路士':'navigator', '星見のエル':'scholar',
});
export const EXPRESSIONS = Object.freeze(['calm','joy','worry','surprise']);
export function expressionForMood(mood) {
  return ({calm:'calm',warm:'joy',hope:'joy',tense:'worry',curious:'surprise'})[mood] || 'calm';
}

// Ordered, finite fallback chain. Only the currently requested face is fetched.
export function portraitCandidates(speaker, mood) {
  const name=String(speaker||'');
  const actor=Object.entries(EXPRESSION_ACTORS).find(([match])=>name.includes(match))?.[1];
  const expression=expressionForMood(mood);
  const candidates=[];
  if(actor)for(const format of ['avif','webp'])candidates.push({
    file:`expressions/${actor}-${expression}.${format}`,
    source:`expression-${format}`,position:'center',expression,
  });
  const anime=animePortraitForSpeaker(speaker);
  if(anime)for(const [file,source] of [[anime.file,'anime-atlas'],[anime.fallback,'anime-webp-fallback']]){
    candidates.push({file,source,position:`${npcAtlasObjectPosition(anime.column)} center`,expression:'calm'});
  }
  candidates.push({file:portraitForSpeaker(speaker),source:'existing-portrait',position:'center 20%',expression:'calm'});
  if(candidates.at(-1).file!=='portrait-vald.webp')candidates.push({file:'portrait-vald.webp',source:'fallback',position:'center 20%',expression:'calm'});
  return candidates;
}

export function setDialoguePortrait(image, speaker, mood, base) {
  const candidates=portraitCandidates(speaker,mood);
  let index=0;
  image.hidden=false;
  image.alt=`${speaker}の立ち絵`;
  const load=()=>{
    const item=candidates[index];
    image.dataset.artSource=item.source;
    image.dataset.expression=item.expression;
    image.style.objectPosition=item.position;
    image.src=base+'assets/'+item.file;
  };
  image.onerror=()=>{
    if(++index<candidates.length)load();
    else {image.onerror=null;image.hidden=true;image.dataset.artSource='unavailable';}
  };
  load();
}
