import type{RoomLayout,Position}from'../buildings/BuildingTypes';

/** Spatial ownership, independent of source model identities or render visibility. */
export function createAuthoredCollisionOwnership(layouts:readonly RoomLayout[]){
 const rows=layouts.map(c=>({c,cos:Math.cos(c.yaw??0),sin:Math.sin(c.yaw??0),radius:Math.hypot(c.width,c.depth)+Math.abs(c.rampStart-c.front)+4,minY:Math.min(c.floorY,c.rampLow)-.5,maxY:Math.max(c.floorY+2.8,...(c.stairs??[]).map(s=>s.to.y+.5))}));
 function owns(row:typeof rows[number],x:number,z:number,y?:number){const{c}=row,dx=x-c.x,dz=z-c.z;if(Math.abs(dx)>row.radius||Math.abs(dz)>row.radius||y!==undefined&&(y<row.minY||y>row.maxY))return false;const lx=c.x+dx*row.cos-dz*row.sin,lz=c.z+dx*row.sin+dz*row.cos;
  if(c.footprint){let inside=false;for(let i=0,j=c.footprint.length-1;i<c.footprint.length;j=i++){const a=c.footprint[i],b=c.footprint[j];if((a.z>lz)!==(b.z>lz)&&lx<(b.x-a.x)*(lz-a.z)/(b.z-a.z)+a.x)inside=!inside;}if(inside)return true;}
  else if(Math.abs(lx-c.x)<=c.width/2+.05&&Math.abs(lz-c.z)<=c.depth/2+.05)return true;
  if(c.exteriorEntrance===false)return false;
  if(Math.abs(lx-c.doorX)<=c.doorWidth/2+.65&&lz>=Math.min(c.front,c.rampStart)-2.5&&lz<=Math.max(c.front,c.rampStart)+2.5)return true;
  const p=c.porch;if(p){if(Math.abs(lx-p.x)<=p.width/2+.1&&Math.abs(lz-p.z)<=p.depth/2+.1)return true;for(const s of p.stairs){const dx=s.to.x-s.from.x,dz=s.to.z-s.from.z,t=Math.max(0,Math.min(1,((lx-s.from.x)*dx+(lz-s.from.z)*dz)/(dx*dx+dz*dz)));if(Math.hypot(lx-s.from.x-dx*t,lz-s.from.z-dz*t)<=s.width/2+.35)return true;}}
  return false;
 }
 return{coversTransition(from:Position,to:Position){for(const row of rows)if(owns(row,from.x,from.z,from.y)&&owns(row,to.x,to.z,to.y))return true;return false;},coversSupport(x:number,z:number){for(const row of rows)if(owns(row,x,z))return true;return false;}};
}
