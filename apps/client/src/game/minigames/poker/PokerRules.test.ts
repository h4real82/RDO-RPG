import {it,expect} from 'vitest';
import {rankHand,compareHands,PokerPractice} from './PokerRules';
it('compares seven-card hands including wheel, flush kickers and full houses',()=>{
 expect(rankHand(['AS','KS','QS','JS','TS','2D','3C']).name).toBe('Straight Flush');
 expect(compareHands(['AS','2D','3C','4H','5S','8S','9D'],['2S','3D','4C','5H','6S','8C','9H'])).toBeLessThan(0);
 expect(compareHands(['AS','AH','AD','KS','KH','2S','3S'],['KS','KH','KD','AS','AH','2H','3H'])).toBeGreaterThan(0);
 expect(compareHands(['AS','KD','QH','JC','TS','2S','3S'],['AH','KC','QS','JD','TH','4S','5S'])).toBe(0);
});
it('keeps chips conserved over streets, all-in, folding and repeated actions after settlement',()=>{
 const game=new PokerPractice(()=>.37);expect(new Set([...game.player,...game.opponent,...game.board]).size).toBe(9);
 expect(()=>game.act('raise',3)).toThrow();
 game.act('call');expect(game.street).toBe(1);game.act('check');game.act('raise',10);game.act('check');
 expect(game.finished).toBe(true);expect(game.stacks[0]+game.stacks[1]).toBe(200);expect(()=>game.act('call')).toThrow();
 const all=new PokerPractice(()=>.27);all.act('raise',100);expect(all.finished).toBe(true);expect(all.stacks[0]+all.stacks[1]).toBe(200);
 const fold=new PokerPractice(()=>.23);fold.act('fold');expect(fold.stacks).toEqual([98,102]);
});

it('allows a short remaining-stack all-in and settles only once',()=>{
 const game=new PokerPractice(()=>.19);game.act('raise',98);expect(game.stacks).toEqual([2,2]);
 game.act('raise',2);expect(game.finished).toBe(true);expect(game.stacks[0]+game.stacks[1]).toBe(200);expect(game.pot).toBe(0);
});
