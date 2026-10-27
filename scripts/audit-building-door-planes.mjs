import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {mkdir,readFile,realpath,writeFile} from 'node:fs/promises';
const [stage,...requests]=process.argv.slice(2);
if(!stage||!/^[a-z0-9-]+$/.test(stage)||!requests.length)throw new Error('Usage: stage building-id:floor-height ...');
const require=createRequire(await realpath('node_modules/@gltf-transform/cli/package.json')),{NodeIO}=require('@gltf-transform/core'),io=new NodeIO();
const measurements=JSON.parse(await readFile('data/reference/valentine/buildings/rollout-source-measurements.json','utf8')),report=[];
for(const request of requests){
 const [id,height]=request.split(':'),floorY=Number(height),measurement=measurements[id];
 if(!measurement||!Number.isFinite(floorY))throw new Error('Unknown building or floor '+request);
 const {asset,position}=measurement.placement,bytes=await readFile('data/runtime/valentine/verified-scene/'+asset),document=await io.readBinary(bytes);
 for(const node of document.getRoot().listNodes())if(node.getTranslation().some(n=>n!==0)||node.getScale().some(n=>n!==1)||node.getRotation().some((n,i)=>Math.abs(n-(i===3?1:0))>1e-7))throw new Error('Unbaked node transform '+id);
 const yaw=measurement.yawDeg*Math.PI/180,co=Math.cos(yaw),si=Math.sin(yaw),candidates=[];
 for(const mesh of document.getRoot().listMeshes())for(const primitive of mesh.listPrimitives()){
  if(primitive.getMaterial()?.getExtras().rdo_shader_hash!=='0xe5d7af85')continue;
  const attribute=primitive.getAttribute('POSITION'),array=attribute.getArray(),indices=primitive.getIndices()?.getArray()??Array.from({length:attribute.getCount()},(_,i)=>i);
  for(let i=0;i<indices.length;i+=3){
   const tri=[0,1,2].map(k=>{const index=indices[i+k]*3,x=array[index],z=array[index+2];return[x*co-z*si,array[index+1]+position.y,x*si+z*co];});
   const min=[0,1,2].map(k=>Math.min(...tri.map(v=>v[k]))),max=[0,1,2].map(k=>Math.max(...tri.map(v=>v[k])));
   if(Math.abs(min[1]-floorY)>.12||max[1]-min[1]<1.9||max[1]>floorY+2.8)continue;
   const u=tri[1].map((v,k)=>v-tri[0][k]),v=tri[2].map((v,k)=>v-tri[0][k]),normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],length=Math.hypot(...normal);
   if(length<.6||Math.abs(normal[1]/length)>.1)continue;
   candidates.push({mesh:mesh.getName(),min,max,normal:normal.map(n=>n/length),area:length/2});
  }
 }
 report.push({id,asset,sha256:createHash('sha256').update(bytes).digest('hex'),position,yawDegrees:measurement.yawDeg,floorY,candidates,
  interpretation:'Door-sized vertical source triangles only. Not original access or MLO portal proof. Candidate alignment may guide explicitly authored gameplay geometry.'});
}
const out='data/runtime/valentine/test-artifacts/headless-map-2026-10-23';await mkdir(out,{recursive:true});await writeFile(`${out}/door-planes-${stage}.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify(report.map(r=>({id:r.id,candidates:r.candidates.length}))));
