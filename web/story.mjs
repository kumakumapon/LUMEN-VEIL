export const freshMemories=()=>({restored:[],choice:null});
export function parseMemories(raw){
 if(raw===undefined)return freshMemories();
 if(!raw||!Array.isArray(raw.restored)||raw.restored.length>3||raw.restored.some(x=>!['street','maker','mira'].includes(x))||new Set(raw.restored).size!==raw.restored.length||![null,'harbor','letter'].includes(raw.choice))throw Error('記憶の記録が不正です。');
 return {restored:[...raw.restored],choice:raw.choice};
}
export const MEMORIES={
 street:{title:'灯りの向こうの道',clues:['案内板には歯車の刻印がある。','セナ「修理の音が、港の奥から聞こえます」'],answers:['整備区画への道','市場の値札'],correct:0,result:'案内板に「整備区画」の文字が戻り、道を照らす灯りがともった。'},
 maker:{title:'道具を作った人',clues:['道具の柄には、小さな星の刻印。','ユイ「星見の人が、いつもこの柄を直してくれたの」'],answers:['航路士の持ち物','観測塔の職人の仕事'],correct:1,result:'道具に作り手の名前が戻った。ユイ「エル……そう、あの人の名前！」'},
 mira:{title:'宛名のない手紙',clues:['手紙の筆跡：「夜明けを忘れないで」。','名札には「航海士ミラ」。裏には同じ筆跡の星の印。'],answers:['航海士ミラへの約束','保管庫の入庫票'],correct:0,result:'封筒に「ミラへ」の文字が戻る。ノエル「君に届けると、約束したんだ」'}
};
export const OPENING=[
 {speaker:'ノエル',line:'この手紙を、夜明けまでに。届け先は……あれ？ 宛名が消えている。'},
 {speaker:'セナ',line:'あなたも見たんですね。名前が、光のようにほどけていくところを。'},
 {speaker:'ノエル',line:'誰との約束だったか思い出せない。でも、届けると約束したことだけは覚えている。'},
 {speaker:'セナ',line:'残った痕跡を探しましょう。名前は、誰かが覚えている限り取り戻せます。まずは港の案内板へ。'}
];
export const STORY_DIALOGUES={
 sena:[{speaker:'セナ',line:'私はセナ。消える前の名前を書き留めています。'},{speaker:'ノエル',line:'記録さえ残せば、忘れた相手にも届けられる？'},{speaker:'セナ',line:'記録と、覚えている人。両方が必要です。一緒に探させてください。'}],
 lamp:[{speaker:'リッツ',line:'名前がなくても、この歯車を直した手の癖は残ってる。'},{speaker:'セナ',line:'文字になっていない記憶も、残るんですね。'},{speaker:'ノエル',line:'なら、手紙にも残っているはずだ。持ち主にしか分からない痕跡が。'}],
 key:[{speaker:'セナ',line:'保管庫の守護機は、読まれなくなった記録を回収するために作られたそうです。'},{speaker:'リッツ',line:'忘鐘は壊れてる。まだ誰かが覚えている名前まで消してしまうんだ。'},{speaker:'ノエル',line:'ミラの名前を返そう。もう、忘れられた記録じゃない。'}]
};
