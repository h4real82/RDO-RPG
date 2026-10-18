import {Group,Mesh,MeshStandardMaterial,Vector3} from 'three';
const normal=new Vector3(),center=new Vector3();
export function updateInteriorWalls(group:Group,cameraPosition:Vector3,dt:number):void {
 group.getWorldPosition(center);const toward=cameraPosition.clone().sub(center);toward.y=0;toward.normalize();
 group.traverse(object=>{
  if(!(object instanceof Mesh) || !object.userData.wallNormal)return;
  const n=object.userData.wallNormal;normal.set(n.x,0,n.z).transformDirection(group.matrixWorld);
  const opacity=normal.dot(toward)>.08?.15:.55;
  const material=object.material;if(!(material instanceof MeshStandardMaterial))return;
  material.transparent=true;material.depthWrite=false;material.opacity+=(opacity-material.opacity)*(1-Math.exp(-10*Math.max(0,dt)));
 });
}
