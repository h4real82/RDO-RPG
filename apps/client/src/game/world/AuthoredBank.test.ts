import { expect, it } from 'vitest';
import { createAuthoredBank, createAuthoredRoom, BANK_GAMEPLAY } from './AuthoredBank';
import { TerrainGround } from './TerrainGround';
import { VisibleMeshCollision } from './VisibleMeshCollision';
import { SourceTraversal } from './SourceTraversal';
import {toWorld} from '../buildings/RoomTransform';
import { Raycaster, Vector3 } from 'three';
import {BUILDINGS} from '../buildings/BuildingRegistry';
import {SpatialContextResolver} from '../interiors/SpatialContext';

it('connects registered hotel and barn floors with real support in both directions',()=>{
 for(const id of ['hotel','val-01-aucbarns-barn2','val-01-aucbarns-barn3']){
  const building=BUILDINGS.byId.get(id)!,lower=building.floors.find(f=>f.id==='ground')!,upper=building.floors.find(f=>f.id==='upper')!;
  expect(lower.layout.stairs?.length??0,`${id} requires a connected staircase`).toBeGreaterThan(0);
  expect(upper.layout.exteriorEntrance).toBe(false);
  const stair=lower.layout.stairs![0],rooms=building.floors.map(f=>createAuthoredRoom(f.layout));
  const ground=new TerrainGround(),collision=new VisibleMeshCollision();
  for(const room of rooms){ground.add(room.support,'structure');collision.add(room.walls);}
  const traversal=new SourceTraversal(ground,collision),context=new SpatialContextResolver([building]);
  let previous=toWorld(lower.layout,stair.from);context.reset(previous);
  for(const t of [...Array.from({length:40},(_,i)=>(i+1)/40),...Array.from({length:40},(_,i)=>(39-i)/40)]){
   const candidate=toWorld(lower.layout,{x:stair.from.x+(stair.to.x-stair.from.x)*t,y:previous.y,z:stair.from.z+(stair.to.z-stair.from.z)*t});
   expect(traversal.resolve(previous,candidate),`${id} stair progress ${t}: ${traversal.blockedReason}`).toBe(true);
   // The final quarter metre joins the level landing with a small, legal step.
   expect(Math.abs(candidate.y-(stair.from.y+(stair.to.y-stair.from.y)*t))).toBeLessThan(.12);
   context.update(previous,candidate,.1);expect(context.current.mode).toBe('indoor');previous=candidate;
   if(t===1)expect(context.current.floor?.id).toBe('upper');
  }
  expect(context.current.floor?.id).toBe('ground');rooms.forEach(room=>room.dispose());
 }
});

it('keeps hidden authored access ramps physically walkable before and after a visibility change',()=>{
 const c={...BANK_GAMEPLAY,x:0,z:0,yaw:0,width:10,depth:10,front:-5,doorX:0,frontDirection:-1 as const,
  floorY:1,rampStart:-8,rampLow:0,porch:undefined,key:'ramp-support-test'};
 const room=createAuthoredRoom(c),ground=new TerrainGround();
 const ramp=room.support.children.find(child=>child.userData.physicsOnly)!;
 expect(ramp.visible).toBe(false);
 for(const visible of [true,false]){
  room.support.visible=visible;ground.add(room.support,'structure');
  expect(ground.heightAt(0,-6.5,.5)).toBeCloseTo(.5,3);
 }
 ground.remove(room.support);room.dispose();
});

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
