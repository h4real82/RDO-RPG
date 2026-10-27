import{evaluateHand,type Card, type CardRank,type CardSuit}from'./SchwimmenRules';
export interface SchnautzConfig{rulesText?:string;startingLives:number;opponents:{id:string;name:string;knockAt:number}[]}
export type SchnautzMove={type:'swap';hand:number;market:number}|{type:'swap-all'|'pass'|'knock'};
export interface SchnautzPlayer{id:string;name:string;lives:number;hand:Card[];knockAt:number}
export interface SchnautzSummary{reason:string;rows:{id:string;name:string;hand:Card[];points:number;lost:boolean;lives:number}[];winner?:string}
export function parseSchnautzConfig(raw:unknown):SchnautzConfig{
 const r=raw as {houseRules?:SchnautzConfig;rulesVersion?:string;rulesText?:string}|null,c=r?.houseRules;
 if(!r||r.rulesVersion!=='valentine-schwimmen-v2'||typeof r.rulesText!=='string'||!r.rulesText.trim()||!c||!Number.isInteger(c.startingLives)||c.startingLives<1||c.startingLives>5||!Array.isArray(c.opponents)||c.opponents.length!==2||new Set(c.opponents.map(p=>p.id)).size!==2||c.opponents.some(p=>!p.id||p.id==='you'||!p.name||!Number.isFinite(p.knockAt)||p.knockAt<20||p.knockAt>30.5))throw new Error('Ungültige Schnautz-Hausvariante.');
 return{...c,rulesText:r.rulesText};
}
function deck32():Card[]{return(['H','D','C','S'] as CardSuit[]).flatMap(suit=>(['7','8','9','10','J','Q','K','A'] as CardRank[]).map(rank=>({suit,rank})));}
const names:Record<CardSuit,string>={H:'Herz',D:'Karo',C:'Kreuz',S:'Pik'};
export const cardLabel=(c:Card)=>`${names[c.suit]} ${c.rank==='A'?'Ass':c.rank==='K'?'König':c.rank==='Q'?'Dame':c.rank==='J'?'Bube':c.rank}`;
/** A bot sees only its own cards, open market and public round pressure. */
export function chooseSchnautzMove(hand:Card[],market:Card[],options:{mayKnock:boolean;turnNumber:number;knockAt:number}):SchnautzMove{
 const score=evaluateHand(hand);let best=score,move:SchnautzMove={type:'pass'};
 for(let h=0;h<3;h++)for(let m=0;m<3;m++){const candidate=hand.slice();candidate[h]=market[m];const points=evaluateHand(candidate);if(points>best){best=points;move={type:'swap',hand:h,market:m};}}
 const all=evaluateHand(market);if(all>best){best=all;move={type:'swap-all'};}
 if(options.mayKnock&&best<31&&(score>=options.knockAt&&best-score<2||options.turnNumber>15&&best===score))return{type:'knock'};
 return move;
}
/** Local practice only: physical card conservation, versioned turns, no wallet. */
export class SchnautzGame{
 phase:'ready'|'playing'|'round-over'|'match-over'='ready';revision=0;round=0;turnNumber=0;turn=0;knocker?:string;finalTurns?:number;
 players:SchnautzPlayer[]=[];market:Card[]=[];deck:Card[]=[];discard:Card[]=[];summary?:SchnautzSummary;message='Nimm am Tisch Platz.';private passes=0;
 constructor(readonly config:SchnautzConfig,private random:()=>number=Math.random){}
 get current(){return this.players[this.turn];}
 private shuffled(cards:Card[]){const result=cards.slice();for(let i=result.length-1;i>0;i--){const roll=this.random(),j=Math.max(0,Math.min(i,Math.floor((Number.isFinite(roll)?roll:0)*(i+1))));[result[i],result[j]]=[result[j],result[i]];}return result;}
 start(){this.players=[{id:'you',name:'Du',lives:this.config.startingLives,hand:[],knockAt:27},...this.config.opponents.map(p=>({...p,lives:this.config.startingLives,hand:[]}))];this.round=0;this.dealRound();}
 nextRound(){if(this.phase!=='round-over')return false;this.dealRound();return true;}
 private dealRound(){
  this.round++;this.turnNumber=0;this.passes=0;this.knocker=undefined;this.finalTurns=undefined;this.summary=undefined;this.deck=this.shuffled(deck32());this.discard=[];
  for(const p of this.players)p.hand=p.lives>0?[this.draw(),this.draw(),this.draw()]:[];
  this.market=[this.draw(),this.draw(),this.draw()];this.turn=(this.round-1)%this.players.length;while(this.players[this.turn].lives===0)this.turn=(this.turn+1)%this.players.length;
  this.phase='playing';this.revision++;this.message=`Runde ${this.round} · ${this.current.name==='Du'?'Du beginnst':this.current.name+' beginnt'}.`;
  if(this.players.some(p=>p.lives>0&&evaluateHand(p.hand)>=31))this.settle('31 oder drei Asse auf der Hand');
 }
 private draw():Card{if(!this.deck.length){this.deck=this.shuffled(this.discard);this.discard=[];}const card=this.deck.pop();if(!card)throw new Error('Der Kartenstapel ist beschädigt. Neue Partie starten.');return card;}
 act(actor:string,move:SchnautzMove,revision=this.revision):{ok:boolean;reason?:string}{
  if(this.phase!=='playing'||this.current?.id!==actor||revision!==this.revision)return{ok:false,reason:'Dieser Zug ist nicht mehr verfügbar.'};
  const player=this.current,alreadyKnocked=this.knocker!==undefined;
  if(move.type==='swap'){
   if(![move.hand,move.market].every(i=>Number.isInteger(i)&&i>=0&&i<3))return{ok:false,reason:'Wähle genau eine Handkarte und eine Tischkarte.'};
   const incoming=this.market[move.market];[player.hand[move.hand],this.market[move.market]]=[incoming,player.hand[move.hand]];this.passes=0;this.message=`${player.name} tauscht eine Karte.`;
  }else if(move.type==='swap-all'){
   [player.hand,this.market]=[this.market,player.hand];this.passes=0;this.message=`${player.name} tauscht alle drei Karten.`;
  }else if(move.type==='knock'){
   if(alreadyKnocked)return{ok:false,reason:'Es wurde bereits geklopft.'};this.knocker=actor;this.finalTurns=this.players.filter(p=>p.lives>0).length-1;this.passes=0;this.message=`${player.name} klopft! Die übrigen Gäste haben noch einen Zug.`;
  }else if(move.type==='pass'){
   this.passes++;this.message=`${player.name} schiebt.`;
   if(this.passes>=this.players.filter(p=>p.lives>0).length){this.discard.push(...this.market);this.market=[this.draw(),this.draw(),this.draw()];this.passes=0;this.message='Alle schieben · drei neue Karten für die Tischmitte.';}
  }else return{ok:false,reason:'Unbekannte Kartenaktion.'};
  this.revision++;this.turnNumber++;
  const value=evaluateHand(player.hand);if(value>=31){this.settle(value===33?'Drei Asse · 33 Punkte':'Schnautz · 31 Punkte');return{ok:true};}
  if(alreadyKnocked&&this.finalTurns!==undefined){this.finalTurns--;if(this.finalTurns===0){this.settle('Letzte Runde beendet');return{ok:true};}}
  do{this.turn=(this.turn+1)%this.players.length;}while(this.current.lives===0);
  return{ok:true};
 }
 private settle(reason:string){
  const active=this.players.filter(p=>p.lives>0),lowest=Math.min(...active.map(p=>evaluateHand(p.hand)));
  const rows=active.map(p=>{const points=evaluateHand(p.hand),lost=points===lowest;if(lost)p.lives--;return{id:p.id,name:p.name,hand:p.hand.map(c=>({...c})),points,lost,lives:p.lives};});
  const remaining=this.players.filter(p=>p.lives>0);this.summary={reason,rows,...(remaining.length===1?{winner:remaining[0].name}:{})};
  this.phase=remaining.length<=1||this.players[0].lives===0?'match-over':'round-over';this.message=remaining.length===0?'Alle Marken verloren · unentschieden.':remaining.length===1?`${remaining[0].name} gewinnt den Tisch.`:this.players[0].lives===0?'Du bist ausgeschieden. Neue Partie, neues Glück.':reason;this.revision++;
 }
}
