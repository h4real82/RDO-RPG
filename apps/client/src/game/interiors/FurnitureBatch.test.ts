import {expect,it} from 'vitest';
import {Box3,Group,Mesh,MeshStandardMaterial,Vector3} from 'three';
import {createSaloonFurniture} from './SaloonFurniture';
import {batchAuthoredFurniture} from './FurnitureBatch';

it('reduces static furniture draws while preserving world bounds and triangle count',()=>{
 const room=new Group(),table=createSaloonFurniture('table',2,1.5);room.add(table);
 room.position.set(-300,117,-800);room.rotation.y=.3;table.position.set(3,0,2);table.rotation.y=.2;
 const bounds=new Box3().setFromObject(room).getSize(new Vector3());
 const triangles=()=>{let count=0;room.traverseVisible(o=>{if(o instanceof Mesh)count+=(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3;});return count;};
 const before=triangles(),batch=batchAuthoredFurniture(room);
 expect(batch.drawsAfter).toBeLessThan(batch.drawsBefore/3);expect(triangles()).toBe(before);
 const after=new Box3().setFromObject(room,true).getSize(new Vector3());
 expect(after.distanceTo(bounds)).toBeLessThan(.0001);
 batch.dispose();batch.dispose();expect(triangles()).toBe(before);
});
it('keeps imported variants and deliberately hidden replacements untouched',()=>{
 const room=new Group(),original=createSaloonFurniture('bed',2,2),hidden=createSaloonFurniture('table',2,2);
 original.userData.sourceAsset='original.glb';hidden.visible=false;room.add(original,hidden);
 const batch=batchAuthoredFurniture(room);expect(batch.drawsBefore).toBe(0);expect(hidden.visible).toBe(false);
 expect(original.children.every(c=>c.visible)).toBe(true);batch.dispose();
});
