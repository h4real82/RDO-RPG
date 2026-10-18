import type { Group,Object3D } from 'three';
import type { SpatialContext } from './SpatialContext';

interface RoomView {support:Group;interior:Group}
export class InteriorPresentation {
  private readonly sources=new Map<Group,boolean>();
  private readonly rooms=new Map<string,RoomView>();
  private readonly childVisibility=new Map<Object3D,boolean>();
  private active?:string;
  trackSource(source:Group):void {this.sources.set(source,source.visible);if(this.active)source.visible=false;}
  untrackSource(source:Group):void {const original=this.sources.get(source);if(original!==undefined)source.visible=original;this.sources.delete(source);}
  registerRoom(key:string,room:RoomView):void {
    this.rooms.set(key,room);
    for(const child of room.support.children)if(child.userData.exteriorAccess)this.childVisibility.set(child,child.visible);
    this.updateRoom(key,room);
  }
  unregisterRoom(key:string):void {
    const room=this.rooms.get(key);if(room){room.support.visible=true;room.interior.visible=false;
      for(const child of room.support.children){const original=this.childVisibility.get(child);if(original!==undefined)child.visible=original;this.childVisibility.delete(child);}}
    this.rooms.delete(key);
  }
  apply(context:SpatialContext):void {
    const next=context.mode==='indoor'?`${context.building?.id}/${context.floor?.id}`:undefined;
    if(next===this.active)return;this.active=next;
    for(const [source,original]of this.sources)source.visible=next?false:original;
    for(const [key,room]of this.rooms)this.updateRoom(key,room);
  }
  private updateRoom(key:string,room:RoomView):void {
    room.support.visible=!this.active || key===this.active;
    room.interior.visible=key===this.active;
    for(const child of room.support.children){
      if(child.userData.physicsOnly)child.visible=false;
      else if(child.userData.interiorSurface)child.visible=key===this.active;
      else if(this.childVisibility.has(child))child.visible=!this.active && this.childVisibility.get(child)!;
    }
  }
  dispose():void {
    for(const [source,original]of this.sources)source.visible=original;
    for(const key of [...this.rooms.keys()])this.unregisterRoom(key);
    this.sources.clear();this.childVisibility.clear();this.active=undefined;
  }
}
