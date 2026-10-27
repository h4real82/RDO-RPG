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

it('selects an explicitly connected doorway from its lower ramp when the complete walk is reachable',()=>{
 const b=BUILDINGS.byId.get('val-01-aucbarns-barn2')!,c=b.floors[0].layout;
 const p=toWorld(c,{x:c.doorX,y:c.rampLow,z:c.rampStart}),door=toWorld(c,{x:c.doorX,y:c.floorY+1,z:c.front});
 const origin=new Vector3(p.x,p.y+8,p.z+10),ray=new Raycaster(origin,new Vector3(door.x,door.y,door.z).sub(origin).normalize());
 expect(pickEntrance(ray,p,[b],()=>true)).toBeDefined();
 expect(pickEntrance(ray,p,[b],()=>false)).toBeUndefined();
 expect(pickEntrance(ray,{...p,y:p.y-2},[b],()=>true)).toBeUndefined();
});
it('recognizes the flat hotel veranda and its side stairs rather than extrapolating one long slope',()=>{
 const b=BUILDINGS.byId.get('hotel')!,c=b.floors[0].layout,stair=c.porch!.stairs.find(s=>s.id==='west')!;
 const players=[toWorld(c,{x:c.doorX,y:c.floorY,z:c.front+c.frontDirection*1.85}),toWorld(c,{x:(stair.from.x+stair.to.x)/2,y:(stair.from.y+stair.to.y)/2,z:(stair.from.z+stair.to.z)/2})];
 const door=toWorld(c,{x:c.doorX,y:c.floorY+1,z:c.front});for(const p of players){const origin=new Vector3(p.x,p.y+7,p.z+6),ray=new Raycaster(origin,new Vector3(door.x,door.y,door.z).sub(origin).normalize());expect(pickEntrance(ray,p,[b],()=>true)).toBeDefined();expect(pickEntrance(ray,{...p,y:p.y-2},[b],()=>true)).toBeUndefined();}
});
