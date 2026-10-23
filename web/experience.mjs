/** Presentation-only cues. Never written into the v1 game save. */
export function firstSteps(state){
  if(!state || state.phase!=='explore' || !state.flags)return null;
  if(!state.flags.sena)return {
    step:1,total:3,title:'まずはセナと話そう',
    description:'金色の目印「セナ」をタップすると近くまで歩きます。PCではWASD・矢印キーで移動し、近づいてEキーでも話せます。',
    action:'セナへ案内'
  };
  if(!state.flags.sign)return {
    step:2,total:3,title:'記憶灯を調べよう',
    description:'港の「記憶灯」の光を調べて、次の道を見つけよう。迷ったら「目的地へ案内」を押せます。',
    action:'記憶灯へ案内'
  };
  if(!state.flags.ritz)return {
    step:3,total:3,title:'整備区画で仲間を探そう',
    description:'港の「整備区画」から進み、リッツを探そう。探索中もメニューから保存できます。',
    action:'次の目的地へ案内'
  };
  return null;
}
export function dialogueMood(speaker,text){
  const line=String(text||'');
  if(/呪い|危険|武器|敵|失われ|消えた|消えて|消える|忘れないで/.test(line))return 'tense';
  if(/[？?]|どうして|なぜ|なのか/.test(line))return 'curious';
  if(/光|旅|星|未来|きっと|照ら|希望|一緒/.test(line))return 'hope';
  if(/ありがとう|覚えて|記録|忘れない|ください|使って/.test(line))return 'warm';
  return 'calm';
}
export function dialogueCue(mood){
  return ({tense:'dialogue-tense',curious:'dialogue-curious',hope:'dialogue-hope',warm:'dialogue-warm',calm:'dialogue-next'})[mood]||'dialogue-next';
}
