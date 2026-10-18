import {toWorld} from '../buildings/RoomTransform';
import { expect, it } from 'vitest';
import { createAuthoredSaloon, SALOON_GAMEPLAY } from './AuthoredSaloon';
import { TerrainGround } from './TerrainGround';
import { VisibleMeshCollision } from './VisibleMeshCollision';
import { SourceTraversal } from './SourceTraversal';

it('walks in and out across the south-facing saloon access and keeps solid side walls',()=>{
  const c=SALOON_GAMEPLAY, room=createAuthoredSaloon(), ground=new TerrainGround(), collision=new VisibleMeshCollision();
  ground.add(room.support,'structure');collision.add(room.walls);const traversal=new SourceTraversal(ground,collision);
  const outside=toWorld(c,{x:c.doorX,y:c.rampLow,z:c.rampStart-.01});
  const inside=toWorld(c,{x:c.doorX,y:c.rampLow,z:c.front-3});
  expect(traversal.resolve(outside,inside)).toBe(true);expect(inside.y).toBeCloseTo(c.floorY);
  const back={...outside};expect(traversal.resolve(inside,back)).toBe(true);
  expect(collision.overlapsBody(inside)).toBe(false);
  const beyond=toWorld(c,{x:c.x-c.width/2-1,y:inside.y,z:c.front-3});
  expect(traversal.resolve(inside,beyond)).toBe(false);expect(traversal.blockedReason).toBe('obstacle');
  room.dispose();
});

it('provides a sparse counter, tables and a wall target while leaving the entrance route clear',()=>{
  const room=createAuthoredSaloon();
  expect(room.interior.getObjectByName('bar-counter')).toBeDefined();
  expect(room.interior.getObjectByName('darts-target')).toBeDefined();
  const collision=new VisibleMeshCollision();collision.add(room.walls);
  expect(collision.overlapsBody(toWorld(SALOON_GAMEPLAY,{x:SALOON_GAMEPLAY.x-4.1,y:SALOON_GAMEPLAY.floorY,z:SALOON_GAMEPLAY.z-1.8}))).toBe(true);
  expect(collision.overlapsBody(toWorld(SALOON_GAMEPLAY,{x:SALOON_GAMEPLAY.doorX,y:SALOON_GAMEPLAY.floorY,z:SALOON_GAMEPLAY.front-2}))).toBe(false);room.dispose();
});

it('has a raised veranda with three source-aligned accesses rather than a street-to-door carpet',()=>{
 const c=SALOON_GAMEPLAY,room=createAuthoredSaloon();expect(c.floorY).toBeGreaterThan(117.9);expect(c.porch?.stairs).toHaveLength(3);
 expect(room.support.children.filter(o=>o.userData.exteriorAccess && o.name.includes('stair'))).toHaveLength(3);
 expect(room.interior.getObjectByName('piano-keys')).toBeDefined();expect(room.interior.getObjectByName('chair-back')).toBeDefined();room.dispose();
});
