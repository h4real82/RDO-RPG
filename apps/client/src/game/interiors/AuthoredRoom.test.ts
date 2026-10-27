import {expect,it} from 'vitest';
import {Raycaster,Vector3,Mesh} from 'three';
import {BUILDINGS} from '../buildings/BuildingRegistry';
import {createAuthoredRoom} from '../world/AuthoredBank';
import {TerrainGround} from '../world/TerrainGround';
import {onFloor} from './SpatialContext';

it('uses an authored concave footprint for both physical floor and indoor context',()=>{
 const layout={...BUILDINGS.byId.get('bank')!.floors[0].layout,x:0,z:0,yaw:0,porch:undefined,fixtures:[],width:10,depth:10,floorY:2,front:-5,doorX:0,rampStart:-7,rampLow:1,
 footprint:[{x:-5,z:-5},{x:5,z:-5},{x:5,z:0},{x:0,z:0},{x:0,z:5},{x:-5,z:5}]};
 const room=createAuthoredRoom(layout),ray=new Raycaster(new Vector3(3,10,3),new Vector3(0,-1,0));
 expect(onFloor({id:'ground',label:'Ground',layout},{x:3,y:2,z:3})).toBe(false);
 expect(ray.intersectObject(room.support,true)).toHaveLength(0);
 expect(onFloor({id:'ground',label:'Ground',layout},{x:-3,y:2,z:3})).toBe(true);
 ray.set(new Vector3(-3,10,3),new Vector3(0,-1,0));expect(ray.intersectObject(room.support,true).length).toBeGreaterThan(0);
 room.dispose();
});

it('keeps physical walls while tagging authored visual walls for indoor presentation',()=>{
 const room=createAuthoredRoom(BUILDINGS.byId.get('bank')!.floors[0].layout);
 expect(room.walls.children.length).toBeGreaterThan(4);
 const visualWalls=room.interior.children.filter(o=>o.name.endsWith('-cutaway')||o.name.endsWith('-upper'));
 expect(visualWalls.length).toBeGreaterThan(4);
 expect(visualWalls.every(o=>o.userData.interiorOnly===true)).toBe(true);
 expect(room.walls.children.every(o=>o instanceof Mesh)).toBe(true);
 room.dispose();
});

it('leaves the upstairs stairwell open and supplies a smooth independently visible stair support',()=>{
 const base=BUILDINGS.byId.get('bank')!.floors[0].layout;
 const lower={...base,x:0,z:0,yaw:0,porch:undefined,fixtures:[],floorY:0,front:-5,doorX:0,rampStart:-7,rampLow:0,
  stairs:[{id:'hotel',from:{x:3,y:0,z:-3},to:{x:3,y:3,z:3},width:1.6,toFloorId:'upper'}]};
 const bottom=createAuthoredRoom(lower),top=createAuthoredRoom({...lower,stairs:[],floorY:3,exteriorEntrance:false,floorHoles:[[{x:2,z:-4},{x:4,z:-4},{x:4,z:2.5},{x:2,z:2.5}]]});
 const ray=new Raycaster(new Vector3(3,10,0),new Vector3(0,-1,0));
 expect(ray.intersectObject(top.support,true)).toHaveLength(0);
 const ground=new TerrainGround();ground.add(bottom.support,'structure');
 expect(ground.heightAt(3,0,1.5)).toBeCloseTo(1.5);
 expect(top.support.getObjectByName('entrance-stripe')).toBeUndefined();
 expect(top.support.children.some(o=>o.userData.exteriorAccess)).toBe(false);
 bottom.dispose();top.dispose();
});
