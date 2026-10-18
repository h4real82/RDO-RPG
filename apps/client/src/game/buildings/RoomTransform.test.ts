import {expect,it} from 'vitest';
import {toRoom,toWorld} from './RoomTransform';
import {BUILDINGS} from './BuildingRegistry';
it('uses the baked building yaw consistently for corners and doorway crossings',()=>{
 const c={...BUILDINGS.byId.get('bank')!.floors[0].layout,yaw:Math.PI/18};
 const p={x:c.x+3,y:c.floorY,z:c.z+7},world=toWorld(c,p),back=toRoom(c,world);
 expect(world.x).not.toBeCloseTo(p.x);expect(back.x).toBeCloseTo(p.x);expect(back.z).toBeCloseTo(p.z);expect(back.y).toBe(p.y);
});
