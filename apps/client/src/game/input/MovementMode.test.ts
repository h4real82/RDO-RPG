import { expect,it } from 'vitest';
import { MovementMode } from './MovementMode';
import { PlayerController } from '../player/PlayerController';

it('runs outdoors but consumes held Shift at a doorway until released again',()=>{
  const mode=new MovementMode();mode.setShift(true);
  expect(mode.resolve(false,false)).toBe('run');expect(mode.resolve(true,false)).toBe('walk');
  expect(mode.resolve(false,false)).toBe('walk');mode.setShift(false);mode.setShift(true);
  expect(mode.resolve(false,false)).toBe('run');expect(mode.resolve(false,false,'walk')).toBe('walk');
  expect(mode.resolve(true,false,'run')).toBe('walk');expect(mode.resolve(false,true)).toBe('stopped');
});
it('re-evaluates speed on physical substeps and retains a short analog final step',()=>{
  const p=new PlayerController({x:0,y:0,z:0},6,()=>true,position=>position.x<1?1.5:1);
  p.setMovement({forward:0,right:1});p.update(.5);
  expect(p.position.x).toBeCloseTo(3.6);
  p.setMovement({forward:0,right:.25});p.update(.1);expect(p.position.x).toBeCloseTo(3.75);
});
