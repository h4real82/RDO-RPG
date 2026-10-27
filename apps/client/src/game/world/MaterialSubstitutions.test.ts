import {expect,it} from 'vitest';
import {Group,Mesh,MeshStandardMaterial,PlaneGeometry,Texture} from 'three';
import {applyMaterialSubstitutions} from './MaterialSubstitutions';
const fixture=()=>{
 const root=new Group(),target=new MeshStandardMaterial(),donor=new MeshStandardMaterial();
 target.name='shader_0_0xbcf03fc1';target.userData={rdo_shader_hash:'0xbcf03fc1',rdo_material_status:'missing-texture'};
 donor.map=new Texture();donor.map.name='val_ew_wallwood62_ab';
 root.add(new Mesh(new PlaneGeometry(),target),new Mesh(new PlaneGeometry(),donor));return{root,target,donor};
};
it('fills only a registered missing diffuse slot and preserves the missing-source evidence',()=>{
 const {root,target,donor}=fixture();expect(applyMaterialSubstitutions(root,'models/valentine/val_hotel_ext.glb')).toBe(1);
 expect(target.map).not.toBe(donor.map);expect(target.map?.source).toBe(donor.map?.source);
 expect(target.userData.rdo_material_status).toBe('missing-texture');expect(target.userData.rdo_missing_original_texture).toBe('val_wt_wood01_ab');
 expect(target.userData.rdo_appearance_provenance).toBe('authored-gameplay');
 expect(applyMaterialSubstitutions(root,'models/valentine/val_hotel_ext.glb')).toBe(0);
});
it('requires exact asset, material, shader and UVs and preserves existing maps',()=>{
 for(const corrupt of [({target}:ReturnType<typeof fixture>)=>{target.name='different-slot';},({target}:ReturnType<typeof fixture>)=>{target.userData.rdo_shader_hash='different';},({target}:ReturnType<typeof fixture>)=>{target.map=new Texture();},({root}:ReturnType<typeof fixture>)=>{(root.children[0] as Mesh).geometry.deleteAttribute('uv');}]){
  const f=fixture();corrupt(f);const before=f.target.map;
  expect(applyMaterialSubstitutions(f.root,'models/valentine/val_hotel_ext.glb')).toBe(0);expect(f.target.map).toBe(before);
 }
 const f=fixture();expect(applyMaterialSubstitutions(f.root,'models/valentine/other.glb')).toBe(0);
});
