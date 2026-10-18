import {Group,Mesh,MeshBasicMaterial,PlaneGeometry,BoxGeometry} from 'three';
import {expect,it} from 'vitest';
import {createPlayableBoundary} from '@rdo-rpg/world-contracts';
import {TerrainGround} from './TerrainGround';
import {VisibleMeshCollision} from './VisibleMeshCollision';

it('requires actual mesh support, a free body, an exit and the whole body inside a concave boundary',async()=>{
 const path='./RoadRecoverySurface',module=await import(path).catch(()=>undefined);
 expect(module?.validateRoadSurface).toBeTypeOf('function');
 const {validateRoadSurface}=module as typeof import('./RoadRecoverySurface');
 const ground=new TerrainGround(),collision=new VisibleMeshCollision();
 const boundary=createPlayableBoundary([[-5,-5],[5,-5],[5,5],[0,5],[0,0],[-5,0]],0.25);
 expect(validateRoadSurface({x:2,z:2},ground,collision,boundary)).toBeUndefined();
 const tile=new Group(),floor=new Mesh(new PlaneGeometry(10,10),new MeshBasicMaterial());floor.rotation.x=-Math.PI/2;tile.add(floor);ground.add(tile);
 const free=validateRoadSurface({x:2,z:2},ground,collision,boundary);
 expect(free).toMatchObject({x:2,z:2});expect(free?.y).toBeCloseTo(0,10);
 expect(validateRoadSurface({x:0.1,z:2},ground,collision,boundary)).toBeUndefined();
 expect(validateRoadSurface({x:-2,z:2},ground,collision,boundary)).toBeUndefined();
 const group=new Group(),wall=new Mesh(new BoxGeometry(.2,2,2),new MeshBasicMaterial());wall.position.set(2,1,2);group.add(wall);collision.add(group);
 expect(validateRoadSurface({x:2.15,z:2},ground,collision,boundary)).toBeUndefined();
 collision.remove(group);ground.remove(tile);expect(validateRoadSurface({x:2,z:2},ground,collision,boundary)).toBeUndefined();
});
