import {readFile,writeFile,mkdir,realpath} from 'node:fs/promises';import {createRequire} from 'node:module';
import {sourceSampler,makeHeightSampler,loadNativeTerrainSurface} from './prepare-authored-landscape.mjs';
const require=createRequire(await realpath('node_modules/@gltf-transform/cli/package.json')),{NodeIO}=require('@gltf-transform/core'),io=new NodeIO();
const T=createRequire(new URL('../apps/client/package.json',import.meta.url))('three'),base='data/runtime/valentine/verified-scene/';
const m=JSON.parse(await readFile(base+'rdo_world_manifest.json','utf8')),triangles=[];
for(const p of m.placements.filter(p=>p.layer==='terrain'&&!p.tags?.includes('authored-gameplay'))){
 const doc=await io.readBinary(await readFile(base+p.asset)),matrix=new T.Matrix4().compose(new T.Vector3(...['x','y','z'].map(k=>p.position[k])),new T.Quaternion().setFromEuler(new T.Euler(...['x','y','z'].map(k=>p.rotation[k]))),new T.Vector3(...['x','y','z'].map(k=>p.scale[k])));
 for(const n of doc.getRoot().listNodes()){
  if(!n.getMesh()||/__lod_(?:med|low|vlow)__/.test(n.getName()))continue;
  const world=matrix.clone().multiply(new T.Matrix4().fromArray(n.getWorldMatrix()));
  for(const prim of n.getMesh().listPrimitives()){
   const attr=prim.getAttribute('POSITION'),idx=prim.getIndices()?.getArray();if(!attr||!idx)continue;
   const points=Array.from({length:attr.getCount()},(_,i)=>new T.Vector3().fromArray(attr.getArray(),i*3).applyMatrix4(world));
   for(let i=0;i<idx.length;i+=3){const t=[points[idx[i]],points[idx[i+1]],points[idx[i+2]]];if(t[1].clone().sub(t[0]).cross(t[2].clone().sub(t[0])).normalize().y>.65)triangles.push(t);}
  }
 }
}
const source=sourceSampler(triangles),samples=JSON.parse(await readFile('data/runtime/valentine/area-expansion-2026-10-19/height-samples.json','utf8'));
const height=makeHeightSampler(Array.isArray(samples)?samples:samples.samples,source),paths=JSON.parse(await readFile('data/reference/valentine/authored-paths.json','utf8')),rows=[];
const before=process.argv.includes('--before'),own=m.placements.find(p=>p.asset==='models/authored/valentine-landscape.glb'),ownDoc=await io.readBinary(await readFile(before?'data/runtime/valentine/world-data-audit-2026-10-24/landscape-before.glb':base+own.asset)),roads=[],gaps=[];
for(const node of ownDoc.getRoot().listNodes()){
 const target=node.getName().startsWith('valentine:road:')?roads:node.getName()==='authored terrain gap fill'?gaps:undefined;if(!target)continue;
 for(const prim of node.getMesh()?.listPrimitives()??[]){const a=prim.getAttribute('POSITION'),idx=prim.getIndices()?.getArray()??Array.from({length:a.getCount()},(_,i)=>i);
  const vertices=Array.from({length:a.getCount()},(_,i)=>({x:a.getArray()[i*3]+own.position.x,y:a.getArray()[i*3+1]+own.position.y,z:a.getArray()[i*3+2]+own.position.z}));
  for(let i=0;i<idx.length;i+=3)target.push([vertices[idx[i]],vertices[idx[i+1]],vertices[idx[i+2]]]);
 }
}
const road=sourceSampler(roads.map(t=>t.map(v=>new T.Vector3(v.x,v.y,v.z)))),gap=sourceSampler(gaps.map(t=>t.map(v=>new T.Vector3(v.x,v.y,v.z))));
const gapWalking=sourceSampler(gaps.map(t=>t.map(v=>new T.Vector3(v.x,v.y,v.z))).filter(t=>t[1].clone().sub(t[0]).cross(t[2].clone().sub(t[0])).normalize().y>.65));
const {source:renderCoverage}=await loadNativeTerrainSurface(io,m,base);
const profiles=[[-447.33,-923.33],[-439.33,-933.33]].map(([cx,z])=>Array.from({length:9},(_,i)=>{const x=cx+(i-4)*.1;return{x,z,native:source(x,z),renderNative:renderCoverage(x,z),gap:gap(x,z),gapWalking:gapWalking(x,z)};}));
await writeFile('data/runtime/valentine/world-data-audit-2026-10-24/edge-profiles.json',JSON.stringify(profiles,null,2));
for(const trace of paths.traces)for(let i=1;i<trace.points.length;i++){
 const a=trace.points[i-1],b=trace.points[i],len=Math.hypot(b.x-a.x,b.z-a.z);
 for(let t=.25;t<1;t+=.25){const x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,y=source(x,z);if(y===undefined)continue;
  const rendered=road(x,z);if(rendered!==undefined)rows.push({trace:trace.id,segment:i,length:len,x,z,native:y,rendered,error:rendered-y});}
}
const overlap=[];for(const t of gaps){const x=t.reduce((s,v)=>s+v.x,0)/3,z=t.reduce((s,v)=>s+v.z,0)/3,y=source(x,z),rendered=gap(x,z);if(y!==undefined&&rendered!==undefined)overlap.push({x,z,error:rendered-y});}
overlap.sort((a,b)=>Math.abs(b.error)-Math.abs(a.error));
const out='data/runtime/valentine/world-data-audit-2026-10-24';await mkdir(out,{recursive:true});rows.sort((a,b)=>Math.abs(b.error)-Math.abs(a.error));await writeFile(out+`/terrain-surfaces${before?'-before':''}.json`,JSON.stringify({triangles:triangles.length,rows,overlap},null,2));console.log(JSON.stringify({samples:rows.length,aboveHalfMeter:rows.filter(r=>Math.abs(r.error)>.5).length,worst:rows.slice(0,2),gapNativeOverlapWorst:overlap.slice(0,2)}));
