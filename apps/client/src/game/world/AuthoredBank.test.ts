import { expect, it } from 'vitest';
import { createAuthoredBank, BANK_GAMEPLAY } from './AuthoredBank';
import { TerrainGround } from './TerrainGround';
import { VisibleMeshCollision } from './VisibleMeshCollision';
import { SourceTraversal } from './SourceTraversal';
import {toWorld} from '../buildings/RoomTransform';
import { Raycaster, Vector3 } from 'three';

it('replaces the threshold with a continuous ramp and permits entry and exit while retaining side walls', () => {
  const bank = createAuthoredBank();
  const ground = new TerrainGround(); ground.add(bank.support, 'structure');
  const collision = new VisibleMeshCollision(); collision.add(bank.walls);
  const traversal = new SourceTraversal(ground, collision);
  const outside=toWorld(BANK_GAMEPLAY,{x:BANK_GAMEPLAY.doorX,y:BANK_GAMEPLAY.rampLow,z:BANK_GAMEPLAY.rampStart+.01});
  outside.y=ground.heightAt(outside.x,outside.z,outside.y)??outside.y;
  const inside=toWorld(BANK_GAMEPLAY,{x:BANK_GAMEPLAY.doorX,y:BANK_GAMEPLAY.rampLow,z:BANK_GAMEPLAY.front+2});
  expect(traversal.resolve(outside, inside)).toBe(true);
  expect(inside.y).toBeCloseTo(BANK_GAMEPLAY.floorY);
  const back = { ...outside }; expect(traversal.resolve(inside, back)).toBe(true);
  expect(back.y).toBeCloseTo(outside.y, 2);
  const throughWall=toWorld(BANK_GAMEPLAY,{x:BANK_GAMEPLAY.x-BANK_GAMEPLAY.width/2-1,y:inside.y,z:BANK_GAMEPLAY.front+2});
  expect(traversal.resolve(inside, throughWall)).toBe(false);
  expect(traversal.blockedReason).toBe('obstacle');
  expect(collision.overlapsBody(inside)).toBe(false);
  const uphillClick=ground.pick(new Raycaster(new Vector3(inside.x,130,inside.z),new Vector3(0,-1,0)),outside.y,hit=>{
    const end={...hit};return traversal.resolve(outside,end) && Math.abs(end.y-hit.y)<0.08;
  });
  expect(uphillClick?.y).toBeCloseTo(BANK_GAMEPLAY.floorY,2);
  bank.dispose();
});
