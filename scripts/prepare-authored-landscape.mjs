/** Own gameplay landscape derived from local ground samples + existing source paths.
 * Never labels interpolated ground, widths or rail geometry as recovered originals. */
import {readFile,writeFile,mkdir,copyFile,realpath} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';import {pathToFileURL,fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';import {createHash} from 'node:crypto';
const {ShapeUtils,Vector2,Vector3,Matrix4,Euler,Quaternion,BufferGeometry,Float32BufferAttribute}=createRequire(new URL('../apps/client/package.json',import.meta.url))('three');
const hash=b=>createHash('sha256').update(b).digest('hex');
export function clipToCell(polygon,x0,z0,x1,z1){
 let result=polygon.map(p=>({...p}));
 for(const [axis,value,sign]of [['x',x0,1],['x',x1,-1],['z',z0,1],['z',z1,-1]]){
  const input=result;result=[];if(!input.length)break;
  for(let i=0;i<input.length;i++){
   const a=input[i],b=input[(i+1)%input.length],ai=(a[axis]-value)*sign>=-1e-8,bi=(b[axis]-value)*sign>=-1e-8;
   if(ai)result.push(a);
   if(ai!==bi){const t=(value-a[axis])/(b[axis]-a[axis]);result.push({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});}
  }
 }
 return result.filter((p,i,a)=>!i||Math.hypot(p.x-a[i-1].x,p.z-a[i-1].z)>1e-7);
}
export function makeHeightSampler(samples,source){
 if(!samples.length)throw new Error('No source height samples');
 const bins=new Map(),cache=new Map(),size=16;
 for(const p of samples){const k=`${Math.floor(p.x/size)}:${Math.floor(p.z/size)}`;if(!bins.has(k))bins.set(k,[]);bins.get(k).push(p);}
 return (x,z)=>{
  const exact=source(x,z);if(exact!==undefined)return exact;
  const cacheKey=`${x.toFixed(6)}:${z.toFixed(6)}`;if(cache.has(cacheKey))return cache.get(cacheKey);
  const bx=Math.floor(x/size),bz=Math.floor(z/size);let nearby=[];
  for(let radius=1;radius<80;radius++){
   for(let dx=-radius;dx<=radius;dx++)for(let dz=-radius;dz<=radius;dz++)if(radius===1||Math.abs(dx)===radius||Math.abs(dz)===radius)nearby.push(...bins.get(`${bx+dx}:${bz+dz}`)??[]);
   if(nearby.length>=8)break;
  }
  if(!nearby.length)nearby=samples;
  const nearest=nearby.map(p=>({p,d:(p.x-x)**2+(p.z-z)**2})).sort((a,b)=>a.d-b.d).slice(0,8);
  let weight=0,y=0;for(const item of nearest){const w=1/Math.max(.01,item.d);weight+=w;y+=item.p.y*w;}
  let result=y/weight;
  // A 2m raster can miss a narrow native gutter. Blend the missing side toward
  // nearby actual source triangles so a coarse sample average cannot bury it.
  for(const radius of [.125,.25,.5,1,2]){
   const hits=[];for(let i=0;i<8;i++){const angle=i*Math.PI/4,h=source(x+Math.cos(angle)*radius,z+Math.sin(angle)*radius);if(h!==undefined)hits.push(h);}
   if(hits.length){const blend=1-radius/2;result=result*(1-blend)+hits.reduce((sum,h)=>sum+h,0)/hits.length*blend;break;}
  }
  cache.set(cacheKey,result);return result;
 };
}
export function makeGapSurface(polygon,source,height,step=2){
 if(!Number.isFinite(step)||step<=0)throw new Error('Invalid grid step');
 const minX=Math.floor(Math.min(...polygon.map(p=>p.x))/step)*step,maxX=Math.max(...polygon.map(p=>p.x));
 const minZ=Math.floor(Math.min(...polygon.map(p=>p.z))/step)*step,maxZ=Math.max(...polygon.map(p=>p.z));
 const positions=[],uv=[],cells=[];
 const middle=(a,b)=>({x:(a.x+b.x)/2,z:(a.z+b.z)/2});
 const emit=(a,b,c,depth=0)=>{
  const ab=middle(a,b),bc=middle(b,c),ca=middle(c,a),center={x:(a.x+b.x+c.x)/3,z:(a.z+b.z+c.z)/3};
  const covered=[a,b,c,ab,bc,ca,center].map(p=>source(p.x,p.z)!==undefined);
  if(covered.every(Boolean))return;
  // Keep source terrain authoritative. Coarse cells across a native edge can
  // otherwise bridge metres above a curved surface, hiding the original mesh.
  if(covered.some(Boolean)&&depth<4){emit(a,ab,ca,depth+1);emit(ab,b,bc,depth+1);emit(ca,bc,c,depth+1);emit(ab,bc,ca,depth+1);return;}
  if(covered.some(Boolean)){
   const vertices=[a,b,c],states=covered.slice(0,3),clipped=[];
   // Resolve the native boundary along each small edge, retaining the actual
   // source height there. No independent vertex clamps that tear shared edges.
   for(let i=0;i<3;i++){
    const p=vertices[i],q=vertices[(i+1)%3],pKnown=states[i],qKnown=states[(i+1)%3];
    if(!pKnown)clipped.push(p);
    if(pKnown!==qKnown){let known=pKnown?p:q,unknown=pKnown?q:p;
     for(let n=0;n<12;n++){const mid=middle(known,unknown);if(source(mid.x,mid.z)!==undefined)known=mid;else unknown=mid;}
     clipped.push({...unknown,sourceHeight:source(known.x,known.z)});
    }
   }
   if(states.every(v=>!v)||states.every(Boolean)){
    if(depth<6){emit(a,ab,ca,depth+1);emit(ab,b,bc,depth+1);emit(ca,bc,c,depth+1);emit(ab,bc,ca,depth+1);return;}
    if(source(center.x,center.z)!==undefined)return;
   }
   for(let i=1;i+1<clipped.length;i++)for(const p of [clipped[0],clipped[i],clipped[i+1]]){positions.push(p.x,(p.sourceHeight??height(p.x,p.z))-.025,p.z);uv.push(p.x/3,p.z/3);}
   return;
  }
  for(const p of [a,b,c]){positions.push(p.x,height(p.x,p.z)-.025,p.z);uv.push(p.x/3,p.z/3);}
 };
 for(let x=minX;x<maxX;x+=step)for(let z=minZ;z<maxZ;z+=step){
  if([[x,z],[x+step,z],[x,z+step],[x+step,z+step],[x+step/2,z+step/2]].every(([a,b])=>source(a,b)!==undefined))continue;
  const clipped=clipToCell(polygon,x,z,x+step,z+step);if(clipped.length<3)continue;
  const triangles=ShapeUtils.triangulateShape(clipped.map(p=>new Vector2(p.x,p.z)),[]);
  for(const tri of triangles){
   // XZ polygon winding is inverted relative to an upward Y face.
   emit(clipped[tri[0]],clipped[tri[2]],clipped[tri[1]]);
  }cells.push([x,z]);
 }
 return {positions,uv,cells};
}
export function sourceSampler(triangles){
 const bins=new Map(),size=8;
 for(const t of triangles){const xs=t.map(p=>p.x),zs=t.map(p=>p.z);
  for(let x=Math.floor(Math.min(...xs)/size);x<=Math.floor(Math.max(...xs)/size);x++)for(let z=Math.floor(Math.min(...zs)/size);z<=Math.floor(Math.max(...zs)/size);z++){
   const k=`${x}:${z}`;if(!bins.has(k))bins.set(k,[]);bins.get(k).push(t);
  }
 }
 return (x,z)=>{
  let y;for(const [a,b,c]of bins.get(`${Math.floor(x/size)}:${Math.floor(z/size)}`)??[]){
   const d=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);if(Math.abs(d)<1e-10)continue;
   const u=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/d,v=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/d,w=1-u-v;
   if(u>=-1e-7&&v>=-1e-7&&w>=-1e-7){const hit=u*a.y+v*b.y+w*c.y;if(y===undefined||hit>y)y=hit;}
  }return y;
 };
}
const append=(target,points,uvs)=>{for(let i=0;i<points.length;i++){target.positions.push(points[i].x,points[i].y,points[i].z);target.uv.push(...uvs[i]);}};
export function makeGroundRibbon(points,width,height,offset=0,lift=.08,edgeFade=0){
 const result={positions:[],uv:[],...(edgeFade>0?{colors:[]}: {})};let distance=0;
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);if(length<1e-5)continue;
  const steps=Math.ceil(length/.8),columns=Math.ceil(width/.8),nx=-dz/length,nz=dx/length;
  for(let j=0;j<steps;j++)for(let column=0;column<columns;column++){
   const quad=[];
   const left=column/columns*2-1,right=(column+1)/columns*2-1;
   for(const [t,s]of [[j/steps,left],[(j+1)/steps,left],[(j+1)/steps,right],[j/steps,right]]){
    const x=a.x+dx*t+nx*(offset+s*width/2),z=a.z+dz*t+nz*(offset+s*width/2);quad.push({x,y:height(x,z)+lift,z});
   }
   const u0=left*width/6,u1=right*width/6,v0=(distance+j/steps*length)/3,v1=(distance+(j+1)/steps*length)/3;
   append(result,[quad[0],quad[2],quad[1],quad[0],quad[3],quad[2]],[[u0,v0],[u1,v1],[u0,v1],[u0,v0],[u1,v0],[u1,v1]]);
   if(result.colors)for(const side of [left,right,left,left,right,right]){
    const t=Math.max(0,Math.min(1,(1-Math.abs(side))*width/2/edgeFade));
    result.colors.push(1,1,1,t*t*(3-2*t));
   }
  }distance+=length;
 }return result;
}
export async function loadNativeTerrainSurface(io,manifest,live,{minNormalY=1e-6}={}){
 const triangles=[],inputs=[];
 for(const placement of manifest.placements.filter(p=>p.layer==='terrain'&&!p.tags?.includes('authored-gameplay'))){
  const bytes=await readFile(resolve(live,placement.asset)),doc=await io.readBinary(bytes);inputs.push({asset:placement.asset,sha256:hash(bytes)});
  const p=placement.position,r=placement.rotation,s=placement.scale,matrix=new Matrix4().compose(new Vector3(p.x,p.y,p.z),new Quaternion().setFromEuler(new Euler(r.x,r.y,r.z,'XYZ')),new Vector3(s.x,s.y,s.z));
  for(const node of doc.getRoot().listNodes()){
   if(!node.getMesh()||/__lod_(?:med|low|vlow)__/.test(node.getName()))continue;
   const world=matrix.clone().multiply(new Matrix4().fromArray(node.getWorldMatrix()));
   for(const primitive of node.getMesh().listPrimitives()){
    const position=primitive.getAttribute('POSITION'),indices=primitive.getIndices();if(!position||!indices)continue;
    const a=position.getArray(),idx=indices.getArray(),vertices=[];
    for(let i=0;i<a.length;i+=3)vertices.push(new Vector3(a[i],a[i+1],a[i+2]).applyMatrix4(world));
    // Render coverage includes native slopes that the player cannot climb.
    // Applying the walking-normal cutoff here wrongly fills real cliffs.
    for(let i=0;i<idx.length;i+=3){const t=[vertices[idx[i]],vertices[idx[i+1]],vertices[idx[i+2]]],n=t[1].clone().sub(t[0]).cross(t[2].clone().sub(t[0])).normalize();if(n.y>minNormalY)triangles.push(t);}
   }
  }
 }
 return {source:sourceSampler(triangles),triangles,inputs};
}
export async function prepareLandscape(){
 const root=fileURLToPath(new URL('../',import.meta.url)),live=resolve(root,'data/runtime/valentine/verified-scene'),out=resolve(root,'data/runtime/valentine/area-expansion-2026-10-19');
 const require=createRequire(await realpath(resolve(root,'node_modules/@gltf-transform/cli/package.json'))),{NodeIO}=require('@gltf-transform/core');
 const io=new NodeIO(),manifestPath=resolve(live,'rdo_world_manifest.json'),manifestBytes=await readFile(manifestPath),manifest=JSON.parse(manifestBytes);
 const polygonBytes=await readFile(resolve(root,'data/reference/valentine/playable-boundary.json')),polygon=JSON.parse(polygonBytes).polygon.map(([x,z])=>({x,z}));
 const tracesBytes=await readFile(resolve(root,'data/reference/valentine/authored-paths.json')),pathData=JSON.parse(tracesBytes),traces=pathData.traces;
 const road={width:5.5,lift:.035,edgeFade:.8,texture:'hea_val_dirt_pebbles_01_abte.png',...pathData.appearance?.road};
 if(![road.width,road.lift,road.edgeFade].every(Number.isFinite)||road.width<=0||road.lift<0||road.edgeFade<=0||road.edgeFade>road.width/2||!/^[a-z0-9_]+\.png$/.test(road.texture))throw new Error('Invalid authored road appearance');
 const {source,triangles,inputs}=await loadNativeTerrainSurface(io,manifest,live);
 const samples=[];
 const minX=Math.floor(Math.min(...polygon.map(p=>p.x))/4)*4,maxX=Math.max(...polygon.map(p=>p.x)),minZ=Math.floor(Math.min(...polygon.map(p=>p.z))/4)*4,maxZ=Math.max(...polygon.map(p=>p.z));
 for(let x=minX-32;x<=maxX+32;x+=2)for(let z=minZ-32;z<=maxZ+32;z+=2){const y=source(x,z);if(y!==undefined)samples.push({x,y,z});}
 const height=makeHeightSampler(samples,source),surface=makeGapSurface(polygon,source,height,2);
 const Document=require('@gltf-transform/core').Document,doc=new Document(),buffer=doc.createBuffer(),scene=doc.createScene();
 const origin={x:-300,y:0,z:-780};
 const texture=async(name,path)=>{const bytes=await readFile(path);return doc.createTexture(name).setImage(bytes).setMimeType('image/png');};
 const grass=await texture('Original Valentine grass albedo',resolve(live,'textures/terrain/hea_grass_val_01_abte.png'));
 const dirtFile=resolve(live,'textures/terrain',road.texture);
 const dirt=await texture('Original local albedo on authored road surface',dirtFile);
 const grassMaterial=doc.createMaterial('authored-gap-grass').setBaseColorTexture(grass).setBaseColorFactor([.64,.82,.52,1]).setMetallicFactor(0).setRoughnessFactor(1).setExtras({provenance:'authored-gameplay',rdo_preview_limitation:'interpolated-native-height-gap-surface'});
 const roadMaterial=doc.createMaterial('authored-road-dirt').setBaseColorTexture(dirt).setBaseColorFactor([1,1,1,1]).setAlphaMode('BLEND').setMetallicFactor(0).setRoughnessFactor(1).setExtras({provenance:'authored-gameplay',rdo_preview_limitation:'source-centerline-authored-width-elevation-edge-fade',sourceTexture:road.texture});
 const ballast=roadMaterial.clone().setName('authored-rail-ballast').setAlphaMode('OPAQUE').setBaseColorFactor([.35,.38,.35,1]);
 const rail=doc.createMaterial('authored-rail-head').setBaseColorFactor([.26,.3,.32,1]).setMetallicFactor(.75).setRoughnessFactor(.5).setExtras({provenance:'authored-gameplay'});
 const timber=doc.createMaterial('authored-rail-sleepers').setBaseColorFactor([.19,.14,.1,1]).setMetallicFactor(0).setRoughnessFactor(.95).setExtras({provenance:'authored-gameplay'});
 const counts={gapTriangles:0,roadTriangles:0,railTriangles:0};
 const add=(name,data,material,count)=>{
  if(!data.positions.length)return;
  const positions=data.positions.map((v,i)=>v-(i%3===0?origin.x:i%3===2?origin.z:0));
  const geometry=new BufferGeometry().setAttribute('position',new Float32BufferAttribute(positions,3));geometry.computeVertexNormals();
  const primitive=doc.createPrimitive().setAttribute('POSITION',doc.createAccessor().setType('VEC3').setArray(new Float32Array(positions)).setBuffer(buffer)).setAttribute('NORMAL',doc.createAccessor().setType('VEC3').setArray(geometry.getAttribute('normal').array).setBuffer(buffer)).setMaterial(material);
  if(data.uv?.length)primitive.setAttribute('TEXCOORD_0',doc.createAccessor().setType('VEC2').setArray(new Float32Array(data.uv)).setBuffer(buffer));
  if(data.colors?.length)primitive.setAttribute('COLOR_0',doc.createAccessor().setType('VEC4').setArray(new Float32Array(data.colors)).setBuffer(buffer));
  scene.addChild(doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(primitive)));counts[count]+=positions.length/9;geometry.dispose();
 };
 add('authored terrain gap fill',surface,grassMaterial,'gapTriangles');
 for(const trace of traces){
  if(trace.kind==='road')add(trace.id,makeGroundRibbon(trace.points,road.width,height,0,road.lift,road.edgeFade),roadMaterial,'roadTriangles');
  else if(trace.kind==='rail'){
   add('rail ballast '+trace.id,makeGroundRibbon(trace.points,3.5,height,0,.055),ballast,'railTriangles');
   for(const offset of [-.7175,.7175])add('steel rail '+offset,makeGroundRibbon(trace.points,.085,height,offset,.16),rail,'railTriangles');
   const ties={positions:[],uv:[]};let carry=0;
   for(let i=1;i<trace.points.length;i++){
    const a=trace.points[i-1],b=trace.points[i],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),ux=dx/len,uz=dz/len;
    for(let d=carry;d<len;d+=.8){const x=a.x+ux*d,z=a.z+uz*d,quad=[];
     for(const [along,side]of [[-.1,-1.2],[.1,-1.2],[.1,1.2],[-.1,1.2]]){const px=x+ux*along-uz*side,pz=z+uz*along+ux*side;quad.push({x:px,y:height(px,pz)+.105,z:pz});}
     append(ties,[quad[0],quad[2],quad[1],quad[0],quad[3],quad[2]],[[0,0],[1,1],[0,1],[0,0],[1,0],[1,1]]);
    }carry=(.8-((len-carry)%.8))%.8;
   }add('wooden sleepers '+trace.id,ties,timber,'railTriangles');
  }
 }
 const asset='models/authored/valentine-landscape.glb';await mkdir(dirname(resolve(live,asset)),{recursive:true});
 doc.getRoot().setExtras({provenance:'authored-gameplay',sourceHeights:inputs,sourceTracesSha256:hash(tracesBytes),note:'Original sources preserved; interpolated height and custom widths/rails are authored approximations.'});
 console.log(JSON.stringify({counts,samples:samples.length,sourceTriangles:triangles.length,meshes:doc.getRoot().listMeshes().length,textures:doc.getRoot().listTextures().length}));
 await io.write(resolve(live,asset),doc);
 const placement={id:'authored:valentine-landscape-2026-10-19',asset,position:origin,rotation:{x:0,y:0,z:0},scale:{x:1,y:1,z:1},layer:'terrain',chunkId:'-2:-4',lod:0,tags:['authored-gameplay','role:terrain','collision:none','occlusion:none']};
 const manifestNew={...manifest,placements:[...manifest.placements.filter(p=>p.id!==placement.id),placement]};
 await writeFile(manifestPath,JSON.stringify(manifestNew,null,2));
 // Keep original import evidence separate from the explicit authored extension.
 const sceneReportPath=resolve(live,'scene-report.json'),sceneReport=JSON.parse(await readFile(sceneReportPath));
 sceneReport.scope='hd-exterior-plus-authored-gameplay';sceneReport.placementCount=manifestNew.placements.length;
 sceneReport.layerCounts=Object.fromEntries([...new Set(manifestNew.placements.map(p=>p.layer))].map(layer=>[layer,manifestNew.placements.filter(p=>p.layer===layer).length]));
 sceneReport.authoredPlacements=[{id:placement.id,asset,provenance:'authored-gameplay',generator:'scripts/prepare-authored-landscape.mjs',sha256:hash(await readFile(resolve(live,asset)))}];
 await writeFile(sceneReportPath,JSON.stringify(sceneReport,null,2));
 const report={at:new Date().toISOString(),provenance:'authored-gameplay',sourceManifestSha256:hash(manifestBytes),boundarySha256:hash(polygonBytes),sourceTracesSha256:hash(tracesBytes),inputs,sourceTriangles:triangles.length,sourceHeightSamples:samples.length,gridMetres:2,...counts,placement,limitations:['Terrain missing-source regions interpolated, no original heights claimed','Road width/elevation and rail geometry authored; source2D alignment uncertainty retained','Original native tiles preserved; small edge overlap at2m cell boundaries possible']};
 await writeFile(resolve(out,'authored-landscape-report.json'),JSON.stringify(report,null,2));
 await writeFile(resolve(out,'height-samples.json'),JSON.stringify(samples));
 console.log(JSON.stringify({...counts,sourceHeightSamples:samples.length,placements:manifestNew.placements.length}));return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await prepareLandscape();
