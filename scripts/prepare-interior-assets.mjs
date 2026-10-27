import {createRequire} from 'node:module';
import {realpathSync} from 'node:fs';
import {mkdir,readFile,writeFile,stat} from 'node:fs/promises';
import {resolve,relative,isAbsolute,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {stripPreviewMasks} from './strip-preview-masks.mjs';
const require=createRequire(realpathSync(new URL('../node_modules/@gltf-transform/cli/package.json',import.meta.url)));
const {NodeIO}=require('@gltf-transform/core');
const {weld,simplify,prune,dedup}=require('@gltf-transform/functions');
const {MeshoptSimplifier}=require('meshoptimizer');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

/** Authored spatial selection, never an inferred original object name. UVs remain untouched. */
export function extractRegion(document,{min,max,yaw=0,materialNames}) {
 if(![min,max].every(a=>Array.isArray(a)&&a.length===3&&a.every(Number.isFinite)) || !Number.isFinite(yaw) || min.some((v,i)=>v>max[i]))throw new Error('Invalid source region');
 const root=document.getRoot(),sin=Math.sin(yaw),cos=Math.cos(yaw),rotated=new Set();let triangles=0;
 for(const mesh of root.listMeshes())for(const primitive of mesh.listPrimitives()){
  const position=primitive.getAttribute('POSITION'),indices=primitive.getIndices();
  if(!position || !indices || primitive.getMode()!==4)throw new Error('Expected indexed static triangles');
  const array=position.getArray();
  if(!rotated.has(position)){for(let i=0;i<array.length;i+=3){const x=array[i],z=array[i+2];array[i]=x*cos-z*sin;array[i+2]=x*sin+z*cos;}rotated.add(position);}
  const normalAccessor=primitive.getAttribute('NORMAL'),normal=normalAccessor?.getArray();
  if(normal && !rotated.has(normalAccessor)){for(let i=0;i<normal.length;i+=3){const x=normal[i],z=normal[i+2];normal[i]=x*cos-z*sin;normal[i+2]=x*sin+z*cos;}rotated.add(normalAccessor);}
  const keep=[],source=indices.getArray();
  if(!materialNames || materialNames.includes(primitive.getMaterial()?.getName()))for(let i=0;i<source.length;i+=3){
   const face=[source[i],source[i+1],source[i+2]];
   if(face.every(index=>min.every((value,axis)=>array[index*3+axis]>=value-1e-5 && array[index*3+axis]<=max[axis]+1e-5)))keep.push(...face);
  }
  triangles+=keep.length/3;
  if(!keep.length){mesh.removePrimitive(primitive);primitive.dispose();continue;}
  // Do not mutate an accessor possibly shared with another primitive.
  primitive.setIndices(document.createAccessor().setType('SCALAR').setArray(new Uint32Array(keep)).setBuffer(indices.getBuffer()));
 }
 if(!triangles)throw new Error('Empty source region');
 return {triangles};
}
export function checkOutputPath(input,output){
 const runtime=fileURLToPath(new URL('../data/runtime/',import.meta.url)),part=relative(runtime,resolve(output));
 if(resolve(input)===resolve(output) || part.startsWith('..') || isAbsolute(part))throw new Error('Use separate output under data/runtime');
}
const triangles=d=>d.getRoot().listMeshes().reduce((sum,m)=>sum+m.listPrimitives().reduce((s,p)=>s+(p.getIndices()?.getCount()??0)/3,0),0);
export async function prepare(input,output,region){
 checkOutputPath(input,output);await mkdir(dirname(resolve(output)),{recursive:true});
 try{await stat(output);throw new Error('Refusing to overwrite existing runtime variant');}catch(e){if(e.code!=='ENOENT')throw e;}
 const io=new NodeIO(),doc=await io.read(input),sourceTriangles=triangles(doc);
 for(const node of doc.getRoot().listNodes())if(node.getTranslation().some(v=>Math.abs(v)>1e-6)||node.getScale().some(v=>Math.abs(v-1)>1e-6)||node.getRotation().some((v,i)=>Math.abs(v-(i===3?1:0))>1e-6))throw new Error('Bake node transforms before region extraction');
 const selection=extractRegion(doc,region);stripPreviewMasks(doc);
 // These converted preview materials use only baseColor TEXCOORD_0. Retain all source data in input.
 for(const mesh of doc.getRoot().listMeshes())for(const p of mesh.listPrimitives())if(p.getMaterial()?.getExtras().rdo_material_status==='diffuse-only')for(const semantic of p.listSemantics())if(/^TEXCOORD_[1-9]\d*$/.test(semantic))p.setAttribute(semantic,null);
 // Rebase using referenced vertices only. Keep source UVs and original texture payloads.
 const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
 for(const m of doc.getRoot().listMeshes())for(const p of m.listPrimitives())for(const i of p.getIndices().getArray()){
  const a=p.getAttribute('POSITION').getArray();for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],a[i*3+k]);hi[k]=Math.max(hi[k],a[i*3+k]);}
 }
 const pivot=[(lo[0]+hi[0])/2,lo[1],(lo[2]+hi[2])/2];
 const transformed=new Set();for(const m of doc.getRoot().listMeshes())for(const p of m.listPrimitives()){
  const accessor=p.getAttribute('POSITION');if(transformed.has(accessor))continue;transformed.add(accessor);
  const a=accessor.getArray();for(let i=0;i<a.length;i++)a[i]-=pivot[i%3];
 }
 await doc.transform(prune(),dedup(),weld());
 const beforeImages=doc.getRoot().listTextures().map(t=>hash(t.getImage())).sort();
 await MeshoptSimplifier.ready;
 await doc.transform(simplify({simplifier:MeshoptSimplifier,ratio:.65,error:.001,lockBorder:true}),prune());
 const afterImages=doc.getRoot().listTextures().map(t=>hash(t.getImage())).sort();
 if(JSON.stringify(beforeImages)!==JSON.stringify(afterImages))throw new Error('Original texture payload changed');
 for(const m of doc.getRoot().listMeshes())for(const p of m.listPrimitives())if(p.getMaterial()?.getBaseColorTexture() && !p.getAttribute('TEXCOORD_0'))throw new Error('Lost original UVs');
 const report={source:resolve(input),sourceSha256:hash(await readFile(input)),sourceTriangles,selectedTriangles:selection.triangles,
  runtimeTriangles:triangles(doc),region,pivot,dimensions:hi.map((v,k)=>v-lo[k]),textureSha256:afterImages,
  operation:'authored region selection; UV-preserving simplification; original embedded albedo bytes retained',shaderLimit:'diffuse-preview, not native RDR2 shader parity'};
 for(const m of doc.getRoot().listMaterials())m.setRoughnessFactor(.78);
 doc.getRoot().setExtras({rdoInteriorSource:report});await io.write(output,doc);
 report.runtimeSha256=hash(await readFile(output));await writeFile(output+'.json',JSON.stringify(report,null,2));return report;
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [input,output,regionFile]=process.argv.slice(2);if(!regionFile)throw new Error('Usage: INPUT OUTPUT REGION.json');
 console.log(JSON.stringify(await prepare(input,output,JSON.parse(await readFile(regionFile,'utf8')))));
}
