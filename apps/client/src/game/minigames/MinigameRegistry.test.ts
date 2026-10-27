import { expect,it } from 'vitest';
import { MINIGAMES,createMinigameRegistry } from './MinigameRegistry';
it('exposes the real local Darts variant and keeps all planned games unavailable',()=>{
  expect(MINIGAMES.all).toHaveLength(15);
  expect(MINIGAMES.resolve('darts','valentine-saloon-practice').load).toBeTypeOf('function');
  expect(()=>MINIGAMES.resolve('darts','missing')).toThrow(/variante/i);
  expect(MINIGAMES.resolve('poker','valentine-holdem-practice').load).toBeTypeOf('function');
  expect(()=>MINIGAMES.resolve('poker','missing')).toThrow(/variante/i);
  expect(MINIGAMES.resolve('boxing','saloon-brawl').load).toBeTypeOf('function');
  expect(MINIGAMES.resolve('wettsaufen','counter-duel').load).toBeTypeOf('function');
  expect(()=>MINIGAMES.resolve('missing','missing')).toThrow(/verfügbar/);
  expect(()=>createMinigameRegistry([MINIGAMES.all[0],MINIGAMES.all[0]])).toThrow(/Duplicate/);
});
