import {toRoom} from '../buildings/RoomTransform';
import type { BuildingDefinition, FloorDefinition, Position } from '../buildings/BuildingTypes';

export interface SpatialContext {
  mode:'outdoor'|'approach'|'indoor';building?:BuildingDefinition;floor?:FloorDefinition;approach:number;
}
const outdoor=():SpatialContext=>({mode:'outdoor',approach:0});
export function onFloor(floor:FloorDefinition,p:Position,margin=0):boolean {
  const c=floor.layout;p=toRoom(c,p);
  return Math.abs(p.y-c.floorY)<.75 && Math.abs(p.x-c.x)<=c.width/2+margin && Math.abs(p.z-c.z)<=c.depth/2+margin;
}
export class SpatialContextResolver {
  current:SpatialContext=outdoor();
  private pending?:{building:BuildingDefinition;floor:FloorDefinition;elapsed:number};
  constructor(private readonly buildings:BuildingDefinition[],
    private readonly reachable:(building:BuildingDefinition,floor:FloorDefinition,position:Position)=>boolean=()=>true) {}

  private approachAt(position:Position):SpatialContext {
    let closest:SpatialContext=outdoor(),best=Infinity;
    for(const building of this.buildings)for(const floor of building.floors){
      const c=floor.layout,p=toRoom(c,position),d=(p.z-c.front)*c.frontDirection;
      const length=Math.abs(c.rampStart-c.front),t=Math.max(0,Math.min(1,d/length));
      const y=c.floorY+(c.rampLow-c.floorY)*t;
      if(d<0 || d>7 || Math.abs(p.x-c.doorX)>c.doorWidth/2+.7 || Math.abs(p.y-y)>.9 || d>=best)continue;
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
    this.current=this.approachAt(position);return this.current;
  }

  update(previous:Position,position:Position,dt:number):SpatialContext {
    if(![position.x,position.y,position.z,dt].every(Number.isFinite) || dt<0)return this.current;
    if(this.current.mode==='indoor' && this.current.floor && onFloor(this.current.floor,position,.25))return this.current;
    if(this.pending && !onFloor(this.pending.floor,position))this.pending=undefined;
    if(!this.pending){
      for(const building of this.buildings)for(const floor of building.floors){
        if(!onFloor(floor,position))continue;
        const c=floor.layout,a=toRoom(c,previous),b=toRoom(c,position),from=(a.z-c.front)*c.frontDirection,to=(b.z-c.front)*c.frontDirection;
        if(from<0 || to>=0 || Math.abs(b.z-a.z)<1e-8)continue;
        const fraction=(c.front-a.z)/(b.z-a.z),x=a.x+(b.x-a.x)*fraction;
        if(fraction>=0 && fraction<=1 && Math.abs(x-c.doorX)<=c.doorWidth/2-.2)this.pending={building,floor,elapsed:0};
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
    return this.buildings.some(b=>b.floors.some(f=>{
      const c=f.layout,p=toRoom(c,position);
      return onFloor(f,position) || (c.porch ? Math.abs(p.x-c.porch.x)<c.porch.width/2+.5 && Math.abs(p.z-c.porch.z)<c.porch.depth/2+1.6
       : Math.abs(p.x-c.doorX)<c.doorWidth/2+.5 && (p.z-c.front)*c.frontDirection>=0 && (p.z-c.front)*c.frontDirection<1.5 && Math.abs(p.y-c.floorY)<1.2);
    }));
  }
}
