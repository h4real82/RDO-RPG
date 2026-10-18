import {InstancedMesh,Mesh,SkinnedMesh,type Object3D} from 'three';
import {acceleratedRaycast,MeshBVH} from 'three-mesh-bvh';

/** Static source acceleration only; indirect BVHs retain the original index/face identities. */
export function prepareSourceRaycasts(root:Object3D):void {
  root.traverseVisible(node=>{
    if(!(node instanceof Mesh) || node instanceof SkinnedMesh || node instanceof InstancedMesh) return;
    const geometry=node.geometry;
    if(!geometry.getAttribute('position') || Object.values(geometry.morphAttributes).some(value=>Array.isArray(value)&&value.length>0)) return;
    // Three ignores groups for a single material; BVH group roots need not cover those same faces.
    if(!Array.isArray(node.material) && geometry.groups.length>0) return;
    if(node.raycast!==Mesh.prototype.raycast && node.raycast!==acceleratedRaycast) return;
    try {
      if(!geometry.boundsTree) {
        const tree=new MeshBVH(geometry,{indirect:true});
        geometry.boundsTree=tree;
        const release=():void=>{
          try {
            if(!geometry) return;
            if(geometry.boundsTree===tree) delete geometry.boundsTree;
            geometry.removeEventListener('dispose',release);
          } catch(error) {console.error('Could not release source raycast index.',error);}
        };
        geometry.addEventListener('dispose',release);
      }
      node.raycast=acceleratedRaycast;
    } catch(error) {console.warn('Source acceleration unavailable; retaining original raycast.',error);}
  });
}
