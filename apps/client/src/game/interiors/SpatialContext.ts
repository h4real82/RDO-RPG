import {containsRoomPoint,exteriorAccessHeight,toRoom} from '../buildings/RoomTransform';
import type { BuildingDefinition, FloorDefinition, Position } from '../buildings/BuildingTypes';

export interface SpatialContext {
  mode:'outdoor'|'approach'|'indoor';building?:BuildingDefinition;floor?:FloorDefinition;approach:number;
}
const outdoor=():SpatialContext=>({mode:'outdoor',approach:0});
export function onFloor(floor:FloorDefinition,p:Position,margin=0):boolean {
  const c=floor.layout;p=toRoom(c,p);
  return Math.abs(p.y-c.floorY)<.75 && containsRoomPoint(c,p,margin);
}
export class SpatialContextResolver {
  current:SpatialContext=outdoor();
  private pending?:{building:BuildingDefinition;floor:FloorDefinition;elapsed:number};
  constructor(private readonly buildings:BuildingDefinition[],
    private readonly reachable:(building:BuildingDefinition,floor:FloorDefinition,position:Position)=>boolean=()=>true) {}

  private stairContextAt(position:Position,building?:BuildingDefinition):SpatialContext|undefined {
    for(const candidate of building?[building]:this.buildings)for(const floor of candidate.floors)for(const stair of floor.layout.stairs??[]){
      const p=toRoom(floor.layout,position),dx=stair.to.x-stair.from.x,dz=stair.to.z-stair.from.z,length=dx*dx+dz*dz;
      if(length<1e-6)continue;
      const t=((p.x-stair.from.x)*dx+(p.z-stair.from.z)*dz)/length;
      if(t<-.08 || t>1.08 || Math.hypot(p.x-stair.from.x-dx*t,p.z-stair.from.z-dz*t)>stair.width/2+.1
        || Math.abs(p.y-stair.from.y-(stair.to.y-stair.from.y)*Math.max(0,Math.min(1,t)))>.55)continue;
      const target=candidate.floors.find(f=>f.id===stair.toFloorId);if(!target)continue;
      const upper=this.current.building?.id===candidate.id && this.current.floor?.id===target.id;
      const selected=t>(upper?.12:.88)?target:floor;
      return {mode:'indoor',building:candidate,floor:selected,approach:1};
    }
  }

  private approachAt(position:Position):SpatialContext {
    let closest:SpatialContext=outdoor(),best=Infinity;
    for(const building of this.buildings)for(const floor of building.floors){
      if(floor.layout.exteriorEntrance===false)continue;
      const c=floor.layout,p=toRoom(c,position),d=(p.z-c.front)*c.frontDirection;
      const length=Math.abs(c.rampStart-c.front),t=Math.max(0,Math.min(1,d/length));
      const y=exteriorAccessHeight(c,position)??(c.floorY+(c.rampLow-c.floorY)*t);
      const xTol = c.openPerimeter ? c.width/2 + 1.0 : c.porch ? c.porch.width/2+.8 : c.doorWidth/2 + .8;
      if(d<0 || d>7 || Math.abs(p.x-c.doorX)>xTol || Math.abs(p.y-y)>.9 || d>=best)continue;
      if(!this.reachable(building,floor,position))continue;
      best=d;closest={mode:'approach',building,floor,approach:1-d/7};
    }
    return closest;
  }

  /** Used only for explicit spawn/recovery/DEV relocation, not ordinary walking. */
  reset(position:Position):SpatialContext {
    this.pending=undefined;
    for(const building of this.buildings)for(const floor of building.floors)if(onFloor(floor,position)){
      this.current={mode:'indoor',building,floor,approach:1};return this.current;
    }
    this.current=this.stairContextAt(position)??this.approachAt(position);return this.current;
  }

  update(previous:Position,position:Position,dt:number):SpatialContext {
    if(![position.x,position.y,position.z,dt].every(Number.isFinite) || dt<0)return this.current;
    if(this.current.mode==='indoor' && this.current.building){
      const stair=this.stairContextAt(position,this.current.building);if(stair){this.pending=undefined;this.current=stair;return this.current;}
    }
    if(this.current.mode==='indoor' && this.current.floor && onFloor(this.current.floor,position,.25))return this.current;
    if(this.pending && !onFloor(this.pending.floor,position))this.pending=undefined;
    if(!this.pending){
      for(const building of this.buildings)for(const floor of building.floors){
        if(floor.layout.exteriorEntrance===false)continue;
        if(!onFloor(floor,position))continue;
        const c=floor.layout,a=toRoom(c,previous),b=toRoom(c,position),from=(a.z-c.front)*c.frontDirection,to=(b.z-c.front)*c.frontDirection;
        let entered=false;
        if(from>=0 && to<0 && Math.abs(b.z-a.z)>=1e-8){
          const fraction=(c.front-a.z)/(b.z-a.z),x=a.x+(b.x-a.x)*fraction;
          if(fraction>=-.1 && fraction<=1.1 && (c.openPerimeter || Math.abs(x-c.doorX)<=c.doorWidth/2+.3))entered=true;
        }
        if(!entered && (this.current.mode==='approach' && this.current.building?.id===building.id && this.current.floor?.id===floor.id)){
          if(c.openPerimeter || (Math.abs(a.x-c.doorX)<=c.doorWidth/2+.7 && from>=0 && from<=2))entered=true;
        }
        if(c.openPerimeter)entered=true;
        if(entered)this.pending={building,floor,elapsed:0};
      }
    }
    if(this.pending){
      this.pending.elapsed+=Math.min(dt,.5);
      if(this.pending.elapsed>=.15){this.current={mode:'indoor',building:this.pending.building,floor:this.pending.floor,approach:1};this.pending=undefined;return this.current;}
      this.current={mode:'approach',building:this.pending.building,floor:this.pending.floor,approach:1};return this.current;
    }
    this.current=this.approachAt(position);return this.current;
  }

  restrictsRunning(position:Position):boolean {
    if(this.stairContextAt(position))return true;
    return this.buildings.some(b=>b.floors.some(f=>{
      const c=f.layout,p=toRoom(c,position),access=exteriorAccessHeight(c,position);
      return onFloor(f,position) || access!==undefined&&Math.abs(position.y-access)<.9 || (c.porch ? Math.abs(p.x-c.porch.x)<c.porch.width/2+.5 && Math.abs(p.z-c.porch.z)<c.porch.depth/2+1.6
       : Math.abs(p.x-c.doorX)<c.doorWidth/2+.5 && (p.z-c.front)*c.frontDirection>=0 && (p.z-c.front)*c.frontDirection<1.5 && Math.abs(p.y-c.floorY)<1.2);
    }));
  }
}
