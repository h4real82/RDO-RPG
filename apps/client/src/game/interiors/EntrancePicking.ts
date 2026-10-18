import {Plane,Raycaster,Vector3} from 'three';import type {BuildingDefinition,Position} from '../buildings/BuildingTypes';import {toRoom,toWorld} from '../buildings/RoomTransform';
/** A doorway is an explicit click target; hidden room floors never become generic ray targets. */
export function pickEntrance(ray:Raycaster,player:Position,buildings:BuildingDefinition[],reachable:(point:Position)=>boolean):Vector3|undefined {
 for(const building of buildings)for(const floor of building.floors){
  const c=floor.layout,p=toRoom(c,player);const inside=(p.z-c.front)*c.frontDirection<0;if(Math.abs(p.y-c.floorY)>.18 || Math.hypot(p.x-c.doorX,p.z-c.front)>4)continue;
  const door=toWorld(c,{x:c.doorX,y:c.floorY,z:c.front}),normal=new Vector3(Math.sin(c.yaw??0)*c.frontDirection,0,Math.cos(c.yaw??0)*c.frontDirection);
  const hit=ray.ray.intersectPlane(new Plane().setFromNormalAndCoplanarPoint(normal,new Vector3(door.x,door.y,door.z)),new Vector3());if(!hit)continue;
  const local=toRoom(c,hit);if(Math.abs(local.x-c.doorX)>c.doorWidth/2 || local.y<c.floorY-(inside?1.5:0) || local.y>c.floorY+2.8)continue;
  const destination=toWorld(c,{x:c.doorX,y:c.floorY,z:c.front+c.frontDirection*(inside?.85:-.85)});if(reachable(destination))return new Vector3(destination.x,destination.y,destination.z);
 }
}
