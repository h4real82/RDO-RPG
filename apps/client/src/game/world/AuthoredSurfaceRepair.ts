import{Float32BufferAttribute,Mesh,MeshStandardMaterial,type Object3D,type Texture}from'three';

/** Uniform-white, untextured CPV surfaces lack any usable appearance information.
 * Retain source files/status; project same-model donor albedo on this runtime copy.
 */
export function repairWhiteSourceSurfaces(root:Object3D):number{
 const donors=new Map<string,Texture>();root.traverse(o=>{if(o instanceof Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof MeshStandardMaterial&&m.map?.name)donors.set(m.map.name,m.map);});
 const roof=[...donors].find(([n])=>/roof.*(shingle|metal)|shingle.*_ab/i.test(n))?.[1],wood=[...donors].find(([n])=>/woodplank|wallwood|woodbeam|wood_beam|woodpainted/i.test(n))?.[1];
 if(!roof&&!wood)return 0;let repaired=0;const replacedGeometry=new Set<Mesh['geometry']>(),replacedMaterial=new Set<MeshStandardMaterial>();
 root.traverse(o=>{if(!(o instanceof Mesh)||Array.isArray(o.material))return;const m=o.material,g=o.geometry,p=g.getAttribute('position'),n=g.getAttribute('normal'),c=g.getAttribute('color');
  if(!(m instanceof MeshStandardMaterial)||m.map||m.userData.rdo_material_status!=='source-vertex-color'||m.userData.rdo_shader_hash!=='0xe5d7af85'||!p||!n||!c)return;
  for(let i=0;i<c.count;i++)if(Math.min(c.getX(i),c.getY(i),c.getZ(i))<.99)return;
  const geometry=g.clone(),uv=new Float32Array(p.count*2),roofs:number[]=[],walls:number[]=[];
  for(let i=0;i<p.count;i++){const y=Math.abs(n.getY(i)),x=Math.abs(n.getX(i));uv[i*2]=(y>.35?p.getX(i):x>.6?p.getZ(i):p.getX(i))/1.8;uv[i*2+1]=(y>.35?p.getZ(i):p.getY(i))/1.8;}
  const index=g.index,total=index?.count??p.count;
  for(let i=0;i<total;i+=3){const a=index?index.getX(i):i,b=index?index.getX(i+1):i+1,d=index?index.getX(i+2):i+2;const bucket=(Math.abs(n.getY(a))+Math.abs(n.getY(b))+Math.abs(n.getY(d)))/3>.35?roofs:walls;bucket.push(a,b,d);}
  geometry.setAttribute('uv',new Float32BufferAttribute(uv,2));geometry.setIndex([...roofs,...walls]);geometry.clearGroups();if(roofs.length)geometry.addGroup(0,roofs.length,0);if(walls.length)geometry.addGroup(roofs.length,walls.length,1);
  const material=(map:Texture)=>{const copy=m.clone();copy.map=map;copy.color.set('#ffffff');copy.vertexColors=false;copy.roughness=1;Object.assign(copy.userData,{rdo_appearance_provenance:'authored-gameplay',rdo_appearance_preview:'white-cpv-same-model-planar-albedo',rdo_appearance_source_texture:map.name,rdo_appearance_limitation:'authored UV projection and donor selection; source files and missing appearance retained'});return copy;};
  replacedGeometry.add(g);replacedMaterial.add(m);o.geometry=geometry;o.material=[material(roof??wood!),material(wood??roof!)];repaired++;
 });
 // A cached glTF can reuse geometry/materials between primitives. Release only
 // resources no longer referenced by this source; donor textures remain shared.
 root.traverse(o=>{if(o instanceof Mesh){replacedGeometry.delete(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof MeshStandardMaterial)replacedMaterial.delete(m);}});
 replacedGeometry.forEach(g=>g.dispose());replacedMaterial.forEach(m=>m.dispose());return repaired;
}
