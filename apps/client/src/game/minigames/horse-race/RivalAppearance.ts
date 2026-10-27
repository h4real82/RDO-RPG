import {Color,Mesh,MeshStandardMaterial,type Material,type Object3D} from 'three';

/** Preserve glTF material slots: a group-less primitive needs a single material. */
export function tintRivalHorse(root:Object3D,tint:Color){
 const copy=(source:Material)=>{const material=source.clone();if(material instanceof MeshStandardMaterial)material.color.multiply(tint);return material;};
 root.traverse(object=>{if(object instanceof Mesh)object.material=Array.isArray(object.material)?object.material.map(copy):copy(object.material);});
}
