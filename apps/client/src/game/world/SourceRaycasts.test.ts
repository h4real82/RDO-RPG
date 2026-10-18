import {BoxGeometry,DoubleSide,Group,Mesh,MeshBasicMaterial,Raycaster,SkinnedMesh,Vector3} from 'three';
import {expect,it} from 'vitest';

async function prepare() {
  const path='./SourceRaycasts',module=await import(path).catch(()=>undefined);
  expect(module?.prepareSourceRaycasts).toBeTypeOf('function');
  return module as typeof import('./SourceRaycasts');
}
const hits=(mesh:Mesh)=>new Raycaster(new Vector3(5,0,3),new Vector3(0,0,-1),0,6).intersectObject(mesh)
  .map(hit=>({point:hit.point.toArray(),distance:hit.distance,face:hit.faceIndex,material:hit.face?.materialIndex}));

it('preserves actual hits, material groups and source arrays with an indirect shared index',async()=>{
  const {prepareSourceRaycasts}=await prepare();
  const geometry=new BoxGeometry(2,2,2),originalIndex=geometry.index!,indices=[...originalIndex.array],positions=geometry.attributes.position.array;
  const materials=Array.from({length:6},()=>new MeshBasicMaterial({side:DoubleSide}));
  const first=new Mesh(geometry,materials);first.position.x=5;first.rotation.y=.2;first.scale.set(1.2,.8,1);first.updateWorldMatrix(true,false);
  const expected=hits(first);expect(expected.length).toBeGreaterThan(0);
  const root=new Group();root.add(first);prepareSourceRaycasts(root);
  expect(hits(first)).toEqual(expected);expect(geometry.index).toBe(originalIndex);expect([...originalIndex.array]).toEqual(indices);expect(geometry.attributes.position.array).toBe(positions);
  const tree=geometry.boundsTree;expect(tree).toBeDefined();
  const second=new Mesh(geometry,materials);root.add(second);prepareSourceRaycasts(root);expect(geometry.boundsTree).toBe(tree);
  geometry.dispose();expect(geometry.boundsTree).toBeUndefined();materials.forEach(m=>m.dispose());
});

it('keeps non-indexed geometry non-indexed and honours the existing draw range',async()=>{
  const {prepareSourceRaycasts}=await prepare(),geometry=new BoxGeometry(2,2,2).toNonIndexed();geometry.clearGroups();geometry.setDrawRange(24,6);
  const mesh=new Mesh(geometry,new MeshBasicMaterial({side:DoubleSide}));mesh.position.x=5;mesh.updateWorldMatrix(true,false);
  const before=hits(mesh);expect(before.length).toBeGreaterThan(0);const root=new Group();root.add(mesh);prepareSourceRaycasts(root);
  expect(hits(mesh)).toEqual(before);expect(geometry.index).toBeNull();expect(geometry.boundsTree).toBeDefined();geometry.dispose();(mesh.material as MeshBasicMaterial).dispose();
});

it('preserves single-material hits outside partial geometry groups using the original fallback',async()=>{
  const {prepareSourceRaycasts}=await prepare(),geometry=new BoxGeometry(2,2,2);geometry.clearGroups();geometry.addGroup(0,6,0);
  const mesh=new Mesh(geometry,new MeshBasicMaterial({side:DoubleSide}));mesh.position.x=5;mesh.updateWorldMatrix(true,false);
  const before=hits(mesh);expect(before.length).toBeGreaterThan(0);const root=new Group();root.add(mesh);prepareSourceRaycasts(root);
  expect(hits(mesh)).toEqual(before);geometry.dispose();(mesh.material as MeshBasicMaterial).dispose();
});

it('leaves hidden and deformed meshes on their existing raycast implementation',async()=>{
  const {prepareSourceRaycasts}=await prepare(),geometry=new BoxGeometry(),material=new MeshBasicMaterial(),root=new Group();
  const hidden=new Mesh(geometry,material),skinned=new SkinnedMesh(geometry,material);hidden.visible=false;root.add(hidden,skinned);
  const original=hidden.raycast,originalSkinned=skinned.raycast;prepareSourceRaycasts(root);
  expect(hidden.raycast).toBe(original);expect(skinned.raycast).toBe(originalSkinned);expect(geometry.boundsTree).toBeUndefined();geometry.dispose();material.dispose();
});
