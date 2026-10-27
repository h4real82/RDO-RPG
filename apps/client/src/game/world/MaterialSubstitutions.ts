import {Mesh,MeshStandardMaterial,type Object3D,type Texture} from 'three';
import substitutions from '../../../../../data/reference/valentine/material-substitutions.json';

/** Authored appearance only. Exact asset/slot/shader matching prevents a missing
 * wood reference from becoming a global shader-based repaint. */
export function applyMaterialSubstitutions(root:Object3D,asset:string):number {
 const definitions=substitutions.materials.filter(entry=>entry.asset===asset);if(!definitions.length)return 0;
 const donors=new Map<string,Texture>(),materials=new Set<MeshStandardMaterial>();
 root.traverse(object=>{
  if(!(object instanceof Mesh) || !object.geometry.getAttribute('uv'))return;
  for(const material of Array.isArray(object.material)?object.material:[object.material])if(material instanceof MeshStandardMaterial){
   materials.add(material);if(material.map?.name)donors.set(material.map.name,material.map);
  }
 });
 let applied=0;
 for(const definition of definitions){
  const donor=donors.get(definition.donorTexture);if(!donor)continue;
  for(const material of materials){
   if(material.name!==definition.material || material.userData.rdo_shader_hash!==definition.shader
     || material.userData.rdo_material_status!=='missing-texture' || material.map)continue;
   material.map=donor.clone();material.color.set('#ffffff');material.vertexColors=false;
   Object.assign(material.userData,{rdo_appearance_provenance:'authored-gameplay',rdo_appearance_preview:'explicit-material-substitute',
    rdo_appearance_source_texture:definition.donorTexture,rdo_missing_original_texture:definition.missingOriginalTexture,
    rdo_appearance_limitation:'authored substitution from same model; original diffuse absent; native shader and palette not reconstructed'});
   material.needsUpdate=true;applied++;
  }
 }
 return applied;
}
