import{expect,it}from'vitest';import{SchnautzGame,chooseSchnautzMove,parseSchnautzConfig,type SchnautzConfig}from'./SchnautzGame';
import variant from '../../../../../../data/reference/minigames/schwimmen/variants/schnautz-31.json';
import type{Card}from'./SchwimmenRules';
const config:SchnautzConfig={startingLives:3,opponents:[{id:'doc',name:'Doc Morgan',knockAt:28},{id:'rose',name:'Rose Callahan',knockAt:25}]};
const seeded=(seed=1)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const cards=(g:SchnautzGame)=>[...g.deck,...g.discard,...g.market,...g.players.flatMap(p=>p.hand)].map(c=>c.suit+c.rank);
// Assemble physical hands from the same deck; the assertions still conserve all 32 cards.
function table(g:SchnautzGame,hands:string[][],market:string[]){
 const all=[...g.deck,...g.discard,...g.market,...g.players.flatMap(p=>p.hand)],take=(id:string)=>{const i=all.findIndex(c=>c.suit+c.rank===id);expect(i).toBeGreaterThanOrEqual(0);return all.splice(i,1)[0] as Card;};
 g.players.forEach((p,i)=>p.hand=hands[i].map(take));g.market=market.map(take);g.deck=all;g.discard=[];
}
it('accepts the real configured house rules and rejects stale or incomplete variants',()=>{
 expect(parseSchnautzConfig(variant).rulesText).toContain('33');
 for(const raw of [null,{...variant,rulesVersion:'valentine-schwimmen-v1'},{...variant,rulesText:''},{...variant,houseRules:{...variant.houseRules,opponents:[variant.houseRules.opponents[0],variant.houseRules.opponents[0]]}}])expect(()=>parseSchnautzConfig(raw)).toThrow();
});
it('settles a real 31-point exchange immediately and preserves physical cards',()=>{
 const g=new SchnautzGame(config,seeded());g.start();table(g,[['HA','HK','D7'],['CA','C9','D8'],['SA','S9','D9']],['HQ','H7','S7']);
 expect(g.act('you',{type:'swap',hand:2,market:0}).ok).toBe(true);expect(g.phase).toBe('round-over');expect(g.summary?.reason).toContain('31');expect(g.summary?.rows[0].points).toBe(31);expect(cards(g)).toHaveLength(32);expect(new Set(cards(g)).size).toBe(32);
});
it('takes every tied lowest mark and distinguishes elimination from an unplayed winner',()=>{
 const g=new SchnautzGame({...config,startingLives:1},seeded());g.start();table(g,[['H7','D8','S9'],['C7','H8','D9'],['CA','CK','C9']],['S7','S8','H9']);
 g.act('you',{type:'knock'});g.act('doc',{type:'pass'});g.act('rose',{type:'pass'});
 expect(g.players.map(p=>p.lives)).toEqual([0,0,1]);expect(g.summary?.winner).toBe('Rose Callahan');expect(g.phase).toBe('match-over');expect(g.nextRound()).toBe(false);
 const out=new SchnautzGame({...config,startingLives:1},seeded());out.start();table(out,[['H7','D8','S9'],['CA','CK','D9'],['SA','SK','C9']],['S7','S8','H9']);
 out.act('you',{type:'knock'});out.act('doc',{type:'pass'});out.act('rose',{type:'pass'});expect(out.phase).toBe('match-over');expect(out.summary?.winner).toBeUndefined();expect(out.message).toContain('ausgeschieden');
});
it('deals a complete unique 32-card deck and alternates real turns',()=>{
 const g=new SchnautzGame(config,seeded());g.start();expect(g.phase).toBe('playing');expect(g.market).toHaveLength(3);expect(g.players.every(p=>p.hand.length===3)).toBe(true);expect(cards(g)).toHaveLength(32);expect(new Set(cards(g)).size).toBe(32);
 expect(g.act('you',{type:'pass'},g.revision).ok).toBe(true);expect(g.current.id).toBe('doc');
});
it('swaps exactly one selected card or the entire hand, conserving every card',()=>{
 const g=new SchnautzGame(config,seeded());g.start();const before=[...cards(g)].sort(),hand=g.players[0].hand.map(c=>({...c})),market=g.market.map(c=>({...c}));
 expect(g.act('you',{type:'swap',hand:1,market:2}).ok).toBe(true);expect(g.players[0].hand[1]).toEqual(market[2]);expect(g.market[2]).toEqual(hand[1]);expect(cards(g).sort()).toEqual(before);
 const other=new SchnautzGame(config,seeded());other.start();const all=other.market.slice();expect(other.act('you',{type:'swap-all'}).ok).toBe(true);expect(other.players[0].hand).toEqual(all);
});
it('rejects out-of-turn, invalid and repeated actions',()=>{
 const g=new SchnautzGame(config,seeded());g.start();const revision=g.revision;expect(g.act('doc',{type:'pass'}).ok).toBe(false);expect(g.act('you',{type:'swap',hand:-1,market:0}).ok).toBe(false);expect(g.revision).toBe(revision);expect(g.act('you',{type:'pass'},revision).ok).toBe(true);expect(g.act('doc',{type:'pass'},revision).ok).toBe(false);
});
it('ends a knocked round only after both remaining guests act once',()=>{
 const g=new SchnautzGame(config,seeded());g.start();expect(g.act('you',{type:'knock'}).ok).toBe(true);expect(g.finalTurns).toBe(2);g.act(g.current.id,{type:'pass'});expect(g.phase).toBe('playing');expect(g.finalTurns).toBe(1);g.act(g.current.id,{type:'pass'});expect(g.phase).toBe('round-over');expect(g.summary).toBeDefined();expect(g.players.some(p=>p.lives===2)).toBe(true);
});
it('refreshes a stuck market after all three players pass',()=>{
 const g=new SchnautzGame(config,seeded());g.start();const old=g.market.map(c=>c.suit+c.rank);for(let i=0;i<3;i++)g.act(g.current.id,{type:'pass'});expect(g.market.map(c=>c.suit+c.rank)).not.toEqual(old);expect(new Set(cards(g)).size).toBe(32);expect(cards(g)).toHaveLength(32);
});
it('finishes seeded complete matches without deadlocks, duplicates or negative lives',()=>{
 for(let seed=1;seed<=40;seed++){const g=new SchnautzGame(config,seeded(seed));g.start();let actions=0;
  while(g.phase!=='match-over'&&actions++<1000){if(g.phase==='round-over')g.nextRound();else g.act(g.current.id,chooseSchnautzMove(g.current.hand,g.market,{mayKnock:g.knocker===undefined,turnNumber:g.turnNumber,knockAt:26}));expect(cards(g)).toHaveLength(32);expect(new Set(cards(g)).size).toBe(32);expect(g.players.every(p=>p.lives>=0)).toBe(true);}
  expect(g.phase,`seed ${seed}`).toBe('match-over');
 }
});

