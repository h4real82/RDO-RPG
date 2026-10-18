import {expect,it} from 'vitest';
import {DEFAULT_DARTS,DartsRound,parseDartsVariant} from './rules';
it('clones variant settings and keeps rounds with different rules independent',()=>{
  const source={...DEFAULT_DARTS,throws:2,maximumScore:100,rings:DEFAULT_DARTS.rings.map(r=>({...r}))};
  const short=new DartsRound(source),normal=new DartsRound();source.rings[0].points=99;
  short.throwAt({x:0,y:0});short.throwAt({x:0,y:0});
  expect(short.total).toBe(100);expect(short.complete).toBe(true);expect(normal.complete).toBe(false);expect(normal.throws).toHaveLength(0);
  expect(()=>parseDartsVariant({...DEFAULT_DARTS,maximumScore:1})).toThrow(/Variante/);
  expect(()=>parseDartsVariant({...DEFAULT_DARTS,rings:[null]})).toThrow();
});
