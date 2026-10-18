import {expect,it,vi} from 'vitest';
import {BoxGeometry,Group,Mesh,MeshStandardMaterial,Texture} from 'three';
import {installRoomAppearance} from './RoomAppearance';
it('replaces visual fixtures with textured source models without touching physical support',async()=>{
 const interior=new Group(),support=new Group(),base=new MeshStandardMaterial({color:'#654321'}),floor=new Mesh(new BoxGeometry(10,.1,20),base);
 base.userData.interiorRole='floor';support.add(floor);const block=new Group();block.name='bar';interior.add(block);
 const original=new Group();original.add(new Mesh(new BoxGeometry(2,2,4),new MeshStandardMaterial()));const release=vi.fn(),texture=new Texture(),disposeTexture=vi.spyOn(texture,'dispose');
 const result=await installRoomAppearance({support,interior},{textures:{floor:{url:'floor.png',repeat:[2,3]}},models:[{url:'bar.glb',replaces:['bar'],position:{x:-3,y:0,z:1},size:{x:2,y:2,z:4}}]},async()=>({instance:original,dispose:release}),async()=>texture);
 expect(block.visible).toBe(false);expect(original.parent?.parent).toBe(interior);expect(floor.geometry.parameters.width).toBe(10);expect(floor.material).not.toBe(base);expect(floor.material.map).toBeTruthy();expect(floor.material.color.getHexString()).toBe('ffffff');
 result.dispose();expect(release).toHaveBeenCalledTimes(1);expect(disposeTexture).toHaveBeenCalledTimes(1);expect(floor.material).toBe(base);expect(block.visible).toBe(true);
});
it('keeps the fallback fixture on failed source load and records missing data',async()=>{
 const interior=new Group(),support=new Group(),block=new Group();block.name='bar';interior.add(block);
 const result=await installRoomAppearance({support,interior},{models:[{url:'missing.glb',replaces:['bar'],position:{x:0,y:0,z:0},size:{x:1,y:1,z:1}}]},async()=>{throw new Error('missing');},async()=>new Texture());
 expect(block.visible).toBe(true);expect(result.missing).toEqual(['missing.glb']);result.dispose();
});
