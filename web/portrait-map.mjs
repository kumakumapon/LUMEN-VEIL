// Dialogue portrait selection is presentation-only and never persisted in saves.
const SPEAKERS = Object.freeze([
  {match:'商人ユイ',file:'portrait-merchant.svg',name:'商人ユイ'},
  {match:'航路士',file:'portrait-navigator.svg',name:'航路士'},
  {match:'星見のエル',file:'portrait-scholar.svg',name:'星見のエル'},
  {match:'ノエル',file:'portrait-noel.webp',name:'ノエル'},
  {match:'セナ',file:'portrait-sena.webp',name:'セナ'},
  {match:'リッツ',file:'portrait-ritz.webp',name:'リッツ'},
]);
export function portraitForSpeaker(speaker){
  const name=String(speaker||'');
  return SPEAKERS.find(entry=>name.includes(entry.match))?.file||'portrait-vald.webp';
}
export function speakerDisplayName(speaker){
  const name=String(speaker||'');
  return SPEAKERS.find(entry=>name.includes(entry.match))?.name||name;
}
