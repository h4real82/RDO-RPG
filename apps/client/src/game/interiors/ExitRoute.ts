import type{Position,RoomLayout}from'../buildings/BuildingTypes';import{toWorld}from'../buildings/RoomTransform';
/** The registered doorway and stair own the complete exit, including the terrain landing. */
export function planExitRoute(c:RoomLayout,player:Position,height:(x:number,z:number,reference:number)=>number|undefined,reachable:(from:Position,to:Position)=>boolean):Position[]|undefined{
 if(c.exteriorEntrance===false)return;
 const door=toWorld(c,{x:c.doorX,y:c.floorY,z:c.front+c.frontDirection*.85});
 const choices=c.porch?c.porch.stairs.map(s=>({top:s.to,foot:s.from})).sort((a,b)=>Math.hypot(a.top.x-c.doorX,a.top.z-c.front)-Math.hypot(b.top.x-c.doorX,b.top.z-c.front)):[{top:undefined,foot:{x:c.doorX,y:c.rampLow,z:c.rampStart}}];
 for(const choice of choices){const foot=choice.foot,dx=foot.x-(choice.top?.x??c.doorX),dz=foot.z-(choice.top?.z??c.front),length=Math.hypot(dx,dz);if(length<.01)continue;
  const landing=toWorld(c,{x:foot.x+dx/length*.6,y:foot.y,z:foot.z+dz/length*.6}),y=height(landing.x,landing.z,foot.y);if(y===undefined||!Number.isFinite(y))continue;landing.y=y;
  const points=[{...door},...(choice.top?[toWorld(c,choice.top)]:[]),toWorld(c,foot),landing],route:Position[]=[];let previous={...player},valid=true;
  for(const p of points){if(Math.hypot(p.x-previous.x,p.z-previous.z)<.05)continue;const candidate={...p};if(!reachable(previous,candidate)){valid=false;break;}route.push(candidate);previous=candidate;}
  if(valid&&route.length)return route;
 }
}
/** Assigning a direct target always clears the queue, including capture/recovery guards. */
export class WaypointMovement{
 private current?:Position;private queue:Position[]=[];
 get target(){return this.current;}
 set target(p:Position|undefined){this.queue=[];this.current=p;}
 start(points:Position[]){this.queue=points.map(p=>({...p}));this.current=this.queue.shift();}
 advance(){this.current=this.queue.shift();}
}
