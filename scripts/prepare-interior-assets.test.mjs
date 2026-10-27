import {test} from 'node:test';import assert from 'node:assert/strict';
import {createRequire} from 'node:module';import {realpathSync} from 'node:fs';
import {extractRegion,checkOutputPath} from './prepare-interior-assets.mjs';
const require=createRequire(realpathSync(new URL('../node_modules/@gltf-transform/cli/package.json',import.meta.url)));
const {Document}=require('@gltf-transform/core');
test('extracts selected original triangles while retaining UVs, material and image bytes',()=>{
 const d=new Document(),b=d.createBuffer();const tex=d.createTexture().setImage(new Uint8Array([1,2,3])).setMimeType('image/png');
 const mat=d.createMaterial('original-wood').setBaseColorTexture(tex).setExtras({rdo_material_status:'diffuse-only'});
 const a=(type,array)=>d.createAccessor().setType(type).setArray(array).setBuffer(b);
 const prim=d.createPrimitive().setMaterial(mat).setAttribute('POSITION',a('VEC3',new Float32Array([0,0,0,1,0,0,0,1,0,5,0,0,6,0,0,5,1,0]))).setAttribute('TEXCOORD_0',a('VEC2',new Float32Array([.1,.2,.7,.2,.1,.8,.5,.5,.6,.5,.5,.6]))).setIndices(a('SCALAR',new Uint16Array([0,1,2,3,4,5])));
 d.createScene().addChild(d.createNode().setMesh(d.createMesh().addPrimitive(prim)));
 const result=extractRegion(d,{min:[-1,-1,-1],max:[2,2,2],yaw:0,materialNames:['original-wood']});
 assert.equal(result.triangles,1);assert.deepEqual([...prim.getIndices().getArray()],[0,1,2]);assert.equal(prim.getMaterial(),mat);assert.deepEqual([...tex.getImage()],[1,2,3]);
 assert.ok(Math.abs(prim.getAttribute('TEXCOORD_0').getArray()[0]-.1)<1e-6);
});
test('rejects empty extraction and raw/in-place destinations',()=>{
 assert.throws(()=>extractRegion(new Document(),{min:[0,0,0],max:[1,1,1],yaw:0}),/empty/i);
 assert.throws(()=>checkOutputPath('D:/Projects/RDO-RPG/data/raw/foo.glb','D:/Projects/RDO-RPG/data/raw/foo.glb'),/runtime|separate/i);
});

test('rotates shared vertex accessors once when several primitives use them',()=>{
 const d=new Document(),b=d.createBuffer(),pos=d.createAccessor().setType('VEC3').setArray(new Float32Array([1,0,0,0,1,0,0,0,1])).setBuffer(b),idx=d.createAccessor().setType('SCALAR').setArray(new Uint16Array([0,1,2])).setBuffer(b);
 const mesh=d.createMesh();for(let n=0;n<2;n++)mesh.addPrimitive(d.createPrimitive().setAttribute('POSITION',pos).setIndices(idx));d.createScene().addChild(d.createNode().setMesh(mesh));
 extractRegion(d,{min:[-2,-2,-2],max:[2,2,2],yaw:Math.PI/2});
 assert.ok(Math.abs(pos.getArray()[0])<1e-5);assert.ok(Math.abs(pos.getArray()[2]-1)<1e-5);
});
