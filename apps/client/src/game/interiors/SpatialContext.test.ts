import {toWorld} from '../buildings/RoomTransform';
import { expect,it } from 'vitest';
import { BUILDINGS } from '../buildings/BuildingRegistry';
import { onFloor, SpatialContextResolver } from './SpatialContext';

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

it('does not select a floor through its ceiling or from several metres below it',()=>{
  const room={x:c.x,y:c.floorY,z:c.z};
  expect(onFloor(b.floors[0],{...room,y:c.floorY-4})).toBe(false);
  expect(onFloor(b.floors[0],{...room,y:c.floorY+3})).toBe(false);
  const upper={...b.floors[0],id:'upper',layout:{...c,floorY:c.floorY+3.5,exteriorEntrance:false}};
  const resolver=new SpatialContextResolver([{...b,floors:[b.floors[0],upper]}]);
  resolver.reset({...room,y:upper.layout.floorY});
  expect(resolver.current.floor?.id).toBe('upper');
});

it('keeps indoor context while ascending and descending a registered stair without floor guessing',()=>{
 const ground={id:'ground',label:'Ground',layout:{...c,x:0,z:0,yaw:0,width:10,depth:12,floorY:0,front:-6,doorX:0,frontDirection:-1 as const,rampStart:-8,rampLow:0,porch:undefined,
  stairs:[{id:'main',from:{x:3,y:0,z:-3},to:{x:3,y:3,z:3},width:1.6,toFloorId:'upper'}]}},
  upper={id:'upper',label:'Upper',layout:{...ground.layout,floorY:3,stairs:[]}};
 const building={...b,floors:[ground,upper]},resolver=new SpatialContextResolver([building]);
 let previous={x:3,y:0,z:-3};resolver.reset(previous);
 for(let step=1;step<=20;step++){
  const position={x:3,y:step*.15,z:-3+step*.3};resolver.update(previous,position,.1);
  expect(resolver.current.mode).toBe('indoor');expect(resolver.restrictsRunning(position)).toBe(true);previous=position;
 }
 expect(resolver.current.floor?.id).toBe('upper');
 for(let step=19;step>=0;step--){const position={x:3,y:step*.15,z:-3+step*.3};resolver.update(previous,position,.1);expect(resolver.current.mode).toBe('indoor');previous=position;}
 expect(resolver.current.floor?.id).toBe('ground');
 resolver.reset({x:-3,y:0,z:0});resolver.update({x:-3,y:0,z:0},{x:-3,y:3,z:0},.2);
 expect(resolver.current.floor?.id).not.toBe('upper');
});
