import {BufferGeometry,Group,Material,Matrix4,Mesh,SkinnedMesh} from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Batch static authored decoration within each fixture. Physics and imported
 * originals are independent; retaining source nodes makes disposal reversible. */
export function batchAuthoredFurniture(interior:Group):{drawsBefore:number;drawsAfter:number;dispose():void} {
 const undo:(()=>void)[]=[],inverse=new Matrix4(),matrix=new Matrix4();
 let drawsBefore=0,drawsAfter=0;
 interior.updateWorldMatrix(true,true);
 for(const fixture of [...interior.children]){
  if(!(fixture instanceof Group) || !fixture.visible || fixture.userData.sourceAsset)continue;
  inverse.copy(fixture.matrixWorld).invert();
  const groups=new Map<Material,Mesh[]>();
  fixture.traverseVisible(object=>{
   if(!(object instanceof Mesh) || Array.isArray(object.material) || object.material.transparent || object instanceof SkinnedMesh)return;
   if(!object.material.visible)return;
   const items=groups.get(object.material)??[];items.push(object);groups.set(object.material,items);
  });
  for(const [material,parts]of groups){
   drawsBefore+=parts.length;
   if(parts.length<2){drawsAfter+=parts.length;continue;}
   const geometries:BufferGeometry[]=parts.map(part=>{
    const geometry=part.geometry.index?part.geometry.toNonIndexed():part.geometry.clone();
    matrix.multiplyMatrices(inverse,part.matrixWorld);geometry.applyMatrix4(matrix);return geometry;
   });
   const merged=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());
   if(!merged){drawsAfter+=parts.length;continue;}
   merged.computeBoundingBox();merged.computeBoundingSphere();
   const mesh=new Mesh(merged,material);mesh.name=`batched-${fixture.name}-${groups.size}-${undo.length}`;
   mesh.userData.provenance='authored-gameplay';fixture.add(mesh);
   parts.forEach(part=>{part.visible=false;});drawsAfter++;
   undo.push(()=>{fixture.remove(mesh);merged.dispose();parts.forEach(part=>{part.visible=true;});});
  }
 }
 let disposed=false;
 return {drawsBefore,drawsAfter,dispose(){if(disposed)return;disposed=true;undo.reverse().forEach(release=>release());}};
}
