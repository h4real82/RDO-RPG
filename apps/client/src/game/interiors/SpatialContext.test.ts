import {toWorld} from '../buildings/RoomTransform';
import { expect,it } from 'vitest';
import { BUILDINGS } from '../buildings/BuildingRegistry';
import { SpatialContextResolver } from './SpatialContext';

const original=BUILDINGS.byId.get('smithfields-saloon')!;const b={...original,floors:original.floors.map(f=>({...f,layout:{...f.layout,yaw:0}}))},c=b.floors[0].layout;
const outside={x:c.doorX,y:c.floorY,z:c.front+0.5},inside={...outside,z:c.front-0.7};
it('approaches only the real entrance corridor, then confirms entry and exit without threshold flicker',()=>{
  const resolver=new SpatialContextResolver([b]);
  resolver.reset(outside);expect(resolver.current.mode).toBe('approach');
  resolver.update(outside,inside,.05);expect(resolver.current.mode).toBe('approach');
  resolver.update(inside,inside,.15);expect(resolver.current.mode).toBe('indoor');
  resolver.update(inside,{...inside,z:c.front+.08},.2);expect(resolver.current.mode).toBe('indoor');
  resolver.update(inside,{...inside,z:c.front+.6},.2);expect(resolver.current.mode).toBe('approach');
  resolver.reset({x:c.x,y:c.floorY,z:c.z-c.depth/2-1});expect(resolver.current.mode).toBe('outdoor');
});
it('never enters through a wall or guesses the floor from height alone; recovery can explicitly reset inside',()=>{
  const resolver=new SpatialContextResolver([b]);
  const wall={x:c.x-c.width/2-1,y:c.floorY,z:c.z},room={x:c.x,y:c.floorY,z:c.z};
  resolver.reset(wall);resolver.update(wall,room,1);expect(resolver.current.mode).toBe('outdoor');
  resolver.reset({...room,y:c.floorY+4});expect(resolver.current.mode).toBe('outdoor');
  resolver.reset(room);expect(resolver.current.floor?.id).toBe('ground');expect(resolver.current.building?.id).toBe(b.id);
});
it('does not zoom toward an obstructed entrance',()=>{
  const resolver=new SpatialContextResolver([b],()=>false);
  resolver.reset(outside);expect(resolver.current.mode).toBe('outdoor');
});
