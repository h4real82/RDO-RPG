import type {Position,RoomLayout} from './BuildingTypes';
/** Layouts retain convenient unrotated world coordinates; only this boundary rotates them. */
export function toWorld(c:RoomLayout,p:Position):Position {
 const yaw=c.yaw??0,co=Math.cos(yaw),si=Math.sin(yaw),x=p.x-c.x,z=p.z-c.z;
 return {x:c.x+x*co+z*si,y:p.y,z:c.z-x*si+z*co};
}
export function toRoom(c:RoomLayout,p:Position):Position {
 const yaw=c.yaw??0,co=Math.cos(yaw),si=Math.sin(yaw),x=p.x-c.x,z=p.z-c.z;
 return {x:c.x+x*co-z*si,y:p.y,z:c.z+x*si+z*co};
}
