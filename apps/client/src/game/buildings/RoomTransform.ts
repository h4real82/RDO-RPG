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

/** One authored height model for porch picking/camera; actual support stays authoritative. */
export function exteriorAccessHeight(c:RoomLayout,position:Position):number|undefined {
 if(c.exteriorEntrance===false)return;const p=toRoom(c,position);
 if(c.porch){
  for(const stair of c.porch.stairs){const dx=stair.to.x-stair.from.x,dz=stair.to.z-stair.from.z,length=dx*dx+dz*dz;if(length<1e-6)continue;
   const t=((p.x-stair.from.x)*dx+(p.z-stair.from.z)*dz)/length;
   if(t<-.08||t>1.05||Math.hypot(p.x-stair.from.x-dx*t,p.z-stair.from.z-dz*t)>stair.width/2+.15)continue;
   return stair.from.y+(stair.to.y-stair.from.y)*Math.max(0,Math.min(1,t));
  }
  if(Math.abs(p.x-c.porch.x)<=c.porch.width/2+.15&&Math.abs(p.z-c.porch.z)<=c.porch.depth/2+.15)return c.floorY;
  return;
 }
 const distance=(p.z-c.front)*c.frontDirection,length=Math.abs(c.rampStart-c.front);
 if(distance<-.15||distance>length+.5||Math.abs(p.x-c.doorX)>c.doorWidth/2+.5)return;
 return c.floorY+(c.rampLow-c.floorY)*Math.max(0,Math.min(1,distance/length));
}

/** Shared polygon test keeps camera context and physical room cutouts consistent. */
export function containsRoomPoint(c:RoomLayout,p:{x:number;z:number},margin=0):boolean {
 if(c.floorHoles?.some(hole=>containsRoomPoint({...c,footprint:hole,floorHoles:undefined},p)))return false;
 if(!c.footprint)return Math.abs(p.x-c.x)<=c.width/2+margin && Math.abs(p.z-c.z)<=c.depth/2+margin;
 let inside=false;
 for(let i=0,j=c.footprint.length-1;i<c.footprint.length;j=i++){
  const a=c.footprint[j],b=c.footprint[i],dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz;
  const t=length>0?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/length)):0;
  if(Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t)<=Math.max(1e-6,margin))return true;
  if((a.z>p.z)!==(b.z>p.z) && p.x<(b.x-a.x)*(p.z-a.z)/(b.z-a.z)+a.x)inside=!inside;
 }
 return inside;
}
