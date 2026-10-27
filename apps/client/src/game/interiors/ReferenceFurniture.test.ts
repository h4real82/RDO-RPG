import {Box3,Mesh,MeshStandardMaterial,Vector3} from 'three';
import {expect,it} from 'vitest';
import {createReferenceFurniture,REFERENCE_FURNITURE_KINDS} from './ReferenceFurniture';

it.each(REFERENCE_FURNITURE_KINDS)('builds bounded textured-role geometry for %s',kind=>{
 const group=createReferenceFurniture(kind,2,1,1.5)!;group.updateWorldMatrix(true,true);
 expect(group.userData.provenance).toBe('authored-gameplay');
 const size=new Box3().setFromObject(group).getSize(new Vector3());
 expect(size.x).toBeGreaterThan(.1);expect(size.x).toBeLessThanOrEqual(2.21);
 expect(size.y).toBeGreaterThan(.1);expect(size.y).toBeLessThanOrEqual(1.66);
 expect(size.z).toBeGreaterThan(.1);expect(size.z).toBeLessThanOrEqual(1.11);
 let wood=0,triangles=0;
 group.traverse(o=>{if(o instanceof Mesh){expect(o.geometry.getAttribute('uv')).toBeDefined();
  expect(Array.from(o.geometry.getAttribute('position').array).every(Number.isFinite)).toBe(true);
  triangles+=(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3;
  if(o.material instanceof MeshStandardMaterial&&['wood','furnitureWood'].includes(o.material.userData.interiorRole))wood++;
 }});
 expect(wood).toBeGreaterThan(0);expect(triangles).toBeLessThan(5000);
 group.traverse(o=>{if(o instanceof Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});
});
it('leaves unrelated factory kinds unchanged',()=>expect(createReferenceFurniture('table',2,1,1)).toBeUndefined());
