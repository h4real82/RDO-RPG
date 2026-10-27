import {Box3,type Group,type Object3D} from 'three';
import type { SpatialContext } from './SpatialContext';

interface RoomView {support:Group;interior:Group}
export class InteriorPresentation {
  private readonly sources=new Map<Group,boolean>();
  private readonly rooms=new Map<string,RoomView>();
  private readonly childVisibility=new Map<Object3D,boolean>();
  private readonly interiorOnly=new Map<Object3D,boolean>();
  private active?:string;
  private viewer?:{x:number;z:number};
  private readonly roomBounds=new Map<string,Box3>();
  trackSource(source:Group):void {this.sources.set(source,source.visible);if(this.active)source.visible=false;}
  untrackSource(source:Group):void {const original=this.sources.get(source);if(original!==undefined)source.visible=original;this.sources.delete(source);}
  registerRoom(key:string,room:RoomView):void {
    this.rooms.set(key,room);
    this.roomBounds.set(key,new Box3().setFromObject(room.support));
    for(const child of room.support.children)this.childVisibility.set(child,child.visible);
    for(const child of room.interior.children)if(child.userData.interiorOnly || child.name.endsWith('-cutaway') || child.name.endsWith('-upper'))this.interiorOnly.set(child,child.visible);
    this.updateRoom(key,room);
  }
  unregisterRoom(key:string):void {
    const room=this.rooms.get(key);if(room){room.support.visible=true;room.interior.visible=false;
      for(const child of room.support.children){const original=this.childVisibility.get(child);if(original!==undefined)child.visible=original;this.childVisibility.delete(child);}
      for(const child of room.interior.children){const original=this.interiorOnly.get(child);if(original!==undefined)child.visible=original;this.interiorOnly.delete(child);}}
    this.rooms.delete(key);this.roomBounds.delete(key);
  }
  apply(context:SpatialContext,position?:{x:number;z:number}):void {
    const next=context.mode==='indoor'?`${context.building?.id}/${context.floor?.id}`:undefined;
    const moved=position&&(!this.viewer||(position.x-this.viewer.x)**2+(position.z-this.viewer.z)**2>=4);
    if(next===this.active&&!moved)return;if(position)this.viewer={x:position.x,z:position.z};this.active=next;
    for(const [source,original]of this.sources)source.visible=next?false:original;
    for(const [key,room]of this.rooms)this.updateRoom(key,room);
  }
  private updateRoom(key:string,room:RoomView):void {
    const isGround = key.split('/')[1] === 'ground';
    const sameBuilding=this.active?.split('/')[0]===key.split('/')[0];
    const showFloor=this.active?key===this.active:isGround;
    room.support.visible=showFloor || Boolean(sameBuilding && room.support.children.some(child=>child.userData.stairConnector));
    // Mask the group, not ordinary fixture children. Appearance loading may
    // deliberately hide a placeholder when its original model becomes ready.
    const bounds=this.roomBounds.get(key),viewer=this.viewer;
    const near=!viewer||!bounds||viewer.x>=bounds.min.x-20&&viewer.x<=bounds.max.x+20&&viewer.z>=bounds.min.z-20&&viewer.z<=bounds.max.z+20;
    room.interior.visible=showFloor&&Boolean(this.active||near);
    for(const child of room.interior.children)if(this.interiorOnly.has(child))child.visible=key===this.active && this.interiorOnly.get(child)!;
    for(const child of room.support.children){
      if(child.userData.physicsOnly)child.visible=false;
      else if(child.userData.stairConnector)child.visible=Boolean(sameBuilding);
      else if(child.userData.exteriorAccess)child.visible=!this.active && this.childVisibility.get(child)===true;
      else if(this.childVisibility.has(child))child.visible=showFloor && this.childVisibility.get(child)!;
    }
  }
  dispose():void {
    for(const [source,original]of this.sources)source.visible=original;
    for(const key of [...this.rooms.keys()])this.unregisterRoom(key);
    this.sources.clear();this.childVisibility.clear();this.interiorOnly.clear();this.roomBounds.clear();this.viewer=undefined;this.active=undefined;
  }
}
