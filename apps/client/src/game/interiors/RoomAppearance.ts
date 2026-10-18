import {Box3,Group,Mesh,MeshStandardMaterial,RepeatWrapping,SRGBColorSpace,Texture,Vector3} from 'three';
import type {RoomAppearance} from '../buildings/BuildingTypes';
type Lease={instance:Group;dispose():void};

/** Decoration has no collision authority. Missing originals leave the playable fallback in place. */
export async function installRoomAppearance(room:{support:Group;interior:Group;floorY?:number},appearance:RoomAppearance,
 loadModel:(url:string)=>Promise<Lease>,loadTexture:(url:string)=>Promise<Texture>) {
 const missing:string[]=[],undo:(()=>void)[]=[],materials=new Set<MeshStandardMaterial>(),textures=new Set<Texture>();
 const textureEntries=Object.entries(appearance.textures??{});
 const loaded=await Promise.allSettled(textureEntries.map(([,entry])=>loadTexture(entry.url)));
 const byRole=new Map<string,{texture:Texture;repeat?:[number,number];offset?:[number,number]}>();
 loaded.forEach((result,index)=>{
  const [role,entry]=textureEntries[index];
  if(result.status==='fulfilled'){
   const texture=result.value;textures.add(texture);texture.colorSpace=SRGBColorSpace;texture.wrapS=texture.wrapT=RepeatWrapping;texture.anisotropy=4;
   byRole.set(role,{texture,repeat:entry.repeat,offset:entry.offset});
  }else missing.push(entry.url);
 });
 for(const root of [room.support,room.interior])root.traverse(object=>{
  if(!(object instanceof Mesh))return;
  if((object.name==='plank-seam' && byRole.has('floor') || object.name==='picture-hills' && byRole.has('art')) && object.material instanceof MeshStandardMaterial){
   const base=object.material,replacement=base.clone();replacement.visible=false;materials.add(replacement);object.material=replacement;undo.push(()=>{object.material=base;});return;
  }
  const base=object.material,items=Array.isArray(base)?base:[base];let changed=false;
  const replacements=items.map(material=>{
   if(!(material instanceof MeshStandardMaterial))return material;
   const role=material.userData.interiorRole,entry=byRole.get(role);if(!entry)return material;
   const replacement=material.clone(),map=entry.texture.clone();textures.add(map);materials.add(replacement);
   if(entry.repeat)map.repeat.set(...entry.repeat);
   if(entry.offset)map.offset.set(...entry.offset);
   if(role==='wallpaper'){
    object.geometry.computeBoundingBox();const extent=object.geometry.boundingBox?.getSize(new Vector3());
    if(extent)map.repeat.set(Math.max(extent.x,extent.z)/1.8,extent.y/1.8);
   }
   if(role==='art'){
    const own=object.userData.ownArtwork,source=object.userData.sourceArtwork;object.userData.ownArtwork=false;object.userData.sourceArtwork=appearance.textures?.art.url;
    undo.push(()=>{object.userData.ownArtwork=own;object.userData.sourceArtwork=source;});
   }
   replacement.map=map;replacement.color.set('#ffffff');replacement.roughness=.82;replacement.needsUpdate=true;changed=true;return replacement;
  });
  if(changed){object.material=Array.isArray(base)?replacements:replacements[0];undo.push(()=>{object.material=base;});}
 });
 const models=appearance.models??[];
 const leases=await Promise.allSettled(models.map(model=>loadModel(model.url)));
 leases.forEach((result,index)=>{
  const definition=models[index];if(result.status!=='fulfilled'){missing.push(definition.url);return;}
  const lease=result.value,object=lease.instance;
  const bounds=new Box3().setFromObject(object),extent=bounds.getSize(new Vector3());
  if(![extent.x,extent.y,extent.z].every(value=>Number.isFinite(value)&&value>1e-5)){lease.dispose();missing.push(definition.url);return;}
  const center=bounds.getCenter(new Vector3()),wrapper=new Group();wrapper.name=`original-${definition.replaces[0]??'fixture'}`;
  wrapper.userData.provenance='source-derived-gameplay-variant';wrapper.userData.sourceAsset=definition.url;
  object.position.sub(new Vector3(center.x,bounds.min.y,center.z));wrapper.add(object);
  wrapper.scale.set(definition.size.x/extent.x,definition.size.y/extent.y,definition.size.z/extent.z);
  wrapper.position.set(definition.position.x,(room.floorY??0)+definition.position.y,definition.position.z);wrapper.rotation.y=definition.yaw??0;
  const hidden=room.interior.children.filter(child=>definition.replaces.includes(child.name)).map(child=>({child,visible:child.visible}));
  hidden.forEach(({child})=>{child.visible=false;});room.interior.add(wrapper);
  undo.push(()=>{room.interior.remove(wrapper);wrapper.remove(object);lease.dispose();hidden.forEach(({child,visible})=>{child.visible=visible;});});
 });
 let disposed=false;
 return {missing,dispose(){if(disposed)return;disposed=true;for(const release of undo.reverse())release();materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}};
}
