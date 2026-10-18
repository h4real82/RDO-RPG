import {expect,it} from 'vitest';import {Raycaster,Vector3} from 'three';import {BUILDINGS} from '../buildings/BuildingRegistry';import {toWorld} from '../buildings/RoomTransform';import {pickEntrance} from './EntrancePicking';
it('accepts the registered doorway from the raised porch, but not street height or a back wall',()=>{
 const b=BUILDINGS.byId.get('smithfields-saloon')!,c=b.floors[0].layout,p=toWorld(c,{x:c.doorX,y:c.floorY,z:c.front+.6});
 const target=toWorld(c,{x:c.doorX,y:c.floorY+1.2,z:c.front}),origin=new Vector3(p.x,c.floorY+3,p.z+4),ray=new Raycaster(origin,new Vector3(target.x,target.y,target.z).sub(origin).normalize());
 expect(pickEntrance(ray,p,[b],()=>true)).toBeDefined();expect(pickEntrance(ray,{...p,y:c.floorY-1},[b],()=>true)).toBeUndefined();expect(pickEntrance(ray,p,[b],()=>false)).toBeUndefined();
});

it('allows a registered exit toward the porch without making invisible arbitrary floors clickable',()=>{
 const b=BUILDINGS.byId.get('smithfields-saloon')!,c=b.floors[0].layout,p=toWorld(c,{x:c.doorX,y:c.floorY,z:c.front-.7}),door=toWorld(c,{x:c.doorX,y:c.floorY+.5,z:c.front});
 const origin=new Vector3(door.x,c.floorY+5,door.z+4),ray=new Raycaster(origin,new Vector3(door.x,door.y,door.z).sub(origin).normalize());
 const destination=pickEntrance(ray,p,[b],()=>true);expect(destination).toBeDefined();
 const expected=toWorld(c,{x:c.doorX,y:c.floorY,z:c.front+.85});expect(destination!.x).toBeCloseTo(expected.x);expect(destination!.z).toBeCloseTo(expected.z);
});
