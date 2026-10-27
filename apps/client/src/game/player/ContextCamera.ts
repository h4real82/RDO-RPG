import type { Position } from '../buildings/BuildingTypes';
import type { SpatialContext } from '../interiors/SpatialContext';

export interface CameraGoal {target:Position;visibleHeight:number;contain?:boolean}
export function resolveContextCamera(context:SpatialContext,player:Position,aspect:number,yaw:number):CameraGoal {
  if(context.mode==='outdoor' || !context.floor)return {target:{...player},visibleHeight:42};
  const c=context.floor.layout,sin=Math.sin(yaw-(c.yaw??0)),cos=Math.cos(yaw-(c.yaw??0));
  const width=Math.abs(c.width*cos)+Math.abs(c.depth*sin);
  const height=.8*(Math.abs(c.width*sin)+Math.abs(c.depth*cos))+1.8;
  const fit=Math.max(6,height/.84,width/(Math.max(.2,aspect)*.84));
  const target={x:c.x,y:c.floorY+.6,z:c.z};
  if(context.mode==='indoor')return {target,visibleHeight:fit,contain:true};
  const t=Math.max(0,Math.min(1,context.approach)),smooth=t*t*(3-2*t);
  return {target:{x:player.x+(target.x-player.x)*smooth*.35,y:player.y,z:player.z+(target.z-player.z)*smooth*.35},
    visibleHeight:42+(Math.min(30,fit)-42)*smooth};
}
