import {toWorld} from '../buildings/RoomTransform';
import type {BuildingAction,Position} from '../buildings/BuildingTypes';
import type {SpatialContext} from './SpatialContext';
export interface ProximityHint {kind:'exit'|'action';label:string;position:Position;opacity:number;actionId?:string}
export function resolveProximityHints(context:SpatialContext,position:Position,
  reachable:(from:Position,to:Position)=>boolean,available:(action:BuildingAction)=>boolean):ProximityHint[]{
  if(context.mode!=='indoor' || !context.building || !context.floor)return [];
  const c=context.floor.layout,hints:ProximityHint[]=[];
  const threshold=toWorld(c,{x:c.doorX,y:c.floorY,z:c.front}),exit=toWorld(c,{x:c.doorX,y:c.floorY,z:c.front-c.frontDirection*.5}),distance=Math.hypot(position.x-threshold.x,position.z-threshold.z);
  if(c.exteriorEntrance!==false && distance<3.5 && reachable(position,exit))hints.push({kind:'exit',label:'↗ Draußen',position:{...threshold,y:c.floorY+.35},opacity:Math.min(1,(3.5-distance)/1.2)});
  for(const action of context.building.actions){
    if(action.floorId!==context.floor.id || !action.position || !action.interactionPosition || !action.radius || !available(action))continue;
    const stand=toWorld(c,action.interactionPosition),anchor=toWorld(c,action.position);
    const distance=Math.hypot(position.x-anchor.x,position.z-anchor.z);
    if(distance<action.radius && reachable(position,stand))hints.push({kind:'action',label:action.id,actionId:action.id,position:anchor,opacity:Math.min(1,(action.radius-distance)/1.2)});
  }
  return hints;
}
