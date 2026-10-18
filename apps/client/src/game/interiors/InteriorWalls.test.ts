import {expect,it} from 'vitest';import {Group,Mesh,BoxGeometry,MeshStandardMaterial,Vector3} from 'three';
import {updateInteriorWalls} from './InteriorWalls';
it('fades camera-facing upper walls and exchanges sides after camera rotation',()=>{
 const g=new Group(),a=new Mesh(new BoxGeometry(),new MeshStandardMaterial()),b=a.clone();b.material=a.material.clone();a.userData.wallNormal={x:1,z:0};b.userData.wallNormal={x:-1,z:0};g.add(a,b);
 updateInteriorWalls(g,new Vector3(10,20,0),10);expect(a.material.opacity).toBeCloseTo(.15);expect(b.material.opacity).toBeCloseTo(.55);expect(a.material.depthWrite).toBe(false);
 updateInteriorWalls(g,new Vector3(-10,20,0),10);expect(a.material.opacity).toBeCloseTo(.55);expect(b.material.opacity).toBeCloseTo(.15);
});

it('uses cardinal side-wall normals from the actual authored room factory',async()=>{
 const {createAuthoredSaloon}=await import('../world/AuthoredSaloon');const room=createAuthoredSaloon();
 expect(room.interior.getObjectByName('east-wall-upper')!.userData.wallNormal).toEqual({x:1,z:0});
 expect(room.interior.getObjectByName('west-wall-upper')!.userData.wallNormal).toEqual({x:-1,z:0});room.dispose();
});
