import {expect,it} from 'vitest';
import {Box3,Mesh,MeshStandardMaterial,Vector3} from 'three';
import {createSaloonFurniture} from './SaloonFurniture';

it('provides recognizable furniture with original-texture roles rather than empty placeholders',()=>{
 for(const kind of ['shelf','bed','bench','desk']){
  const furniture=createSaloonFurniture(kind,1.8,kind==='bed'?2.2:.7);
  const bounds=new Box3().setFromObject(furniture).getSize(new Vector3());
  expect(bounds.x,kind).toBeGreaterThan(1.5);expect(bounds.y,kind).toBeGreaterThan(.4);
  const roles:string[]=[];furniture.traverse(object=>{if(object instanceof Mesh && object.material instanceof MeshStandardMaterial && object.material.userData.interiorRole)roles.push(object.material.userData.interiorRole);});
  expect(roles.some(role=>role==='wood'||role==='furnitureWood'),kind).toBe(true);
  if(kind==='bed')expect(roles).toContain('rug');
 }
});

it('makes a hollow bath with rim and feet inside its collision footprint',()=>{
 const bath=createSaloonFurniture('bathtub',1.2,2);
 expect(bath.getObjectByName('bath-shell')).toBeDefined();
 expect(bath.getObjectByName('table-top')).toBeUndefined();
 expect(bath.getObjectByName('bath-rim')).toBeDefined();
 const size=new Box3().setFromObject(bath).getSize(new Vector3());
 expect(size.x).toBeCloseTo(1.2,1);expect(size.z).toBeCloseTo(2,1);
});
