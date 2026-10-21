export type Phase = 'explore' | 'battle' | 'defeat' | 'ending';
export type Area = 'harbor' | 'corridor' | 'vault' | 'dock' | 'market' | 'observatory';
export type Command = 'attack' | 'arts' | 'echo' | 'guard';
export interface Hero { id: string; name: string; role: string; hp: number; mp: number; maxHp: number; maxMp: number; power: number; art: string }
export interface Battle { kind: string; name: string; hp: number; maxHp: number; break: number; maxBreak: number; stagger: boolean; count: number; actorIndex: number; lastAction: { damage: number; shred: number; owner: string; name: string } | null; log: string }
export interface GameView { phase: Phase; area: Area; flags: Record<string, boolean>; records: string[]; party: Hero[]; battle: Battle | null; resonance: number; difficulty: string }
export interface Settings { volume: number; reduceMotion: boolean; fontScale: number; difficulty: string }
export interface GameEvent { state: GameView | null; settings: Settings }
export function emitCustom<T>(name: string, detail: T): void { window.dispatchEvent(new CustomEvent<T>(name, { detail })); }
