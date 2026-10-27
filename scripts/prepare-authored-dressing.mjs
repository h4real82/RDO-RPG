/** Authored decorative adaptation. Original model/texture sources stay unchanged. */
import { readFile, writeFile, mkdir, realpath } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { makeHeightSampler,loadNativeTerrainSurface,makeGapSurface } from './prepare-authored-landscape.mjs';
import {foliageSvg} from './authored-foliage.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const live=resolve(root,'data/runtime/valentine/verified-scene');
const dressingPath=resolve(root,'data/reference/valentine/environment-dressing.json');
const {CylinderGeometry,BoxGeometry,PlaneGeometry,Vector3,Quaternion,Matrix4,Euler}=createRequire(new URL('../apps/client/package.json',import.meta.url))('three');
export const makeDressingCylinder=(top,bottom,height)=>new CylinderGeometry(top,bottom,height,8);
export function resolveDressingAnchors(dressing,manifest){
 const anchors=new Map();
 for(const p of manifest.placements??[]){if(p.layer!=='buildings')continue;const a={x:p.position.x,z:p.position.z};anchors.set(p.asset.replace('models/valentine/','').replace('.glb',''),a);for(const tag of p.tags??[])if(tag.startsWith('landmark:'))anchors.set(tag.slice(9),a);}
 for(const a of dressing.anchors??[]){if(![a.x,a.z].every(Number.isFinite))throw new Error(`Invalid anchor ${a.id}`);anchors.set(a.id,{x:a.x,z:a.z});}
 return anchors;
}
export function makeDressingHeightSampler(samples,source=()=>undefined){
 if(!samples.length||samples.some(p=>![p.x,p.y,p.z].every(Number.isFinite)))throw new Error('Valid source height samples required');
 const exact=new Map(samples.map(p=>[`${p.x}:${p.z}`,p.y]));
 const height=makeHeightSampler(samples,source);
 return (x,z)=>{const native=source(x,z);if(native!==undefined)return native;const y=exact.get(`${x}:${z}`);if(y!==undefined)return y;let nearest=Infinity;for(const p of samples)nearest=Math.min(nearest,(p.x-x)**2+(p.z-z)**2);return nearest>32**2?undefined:height(x,z);};
}
const segmentDistance=(x,z,a,b)=>{const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);};
function inside(x,z,polygon){let hit=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const [a,b]=polygon[i],[c,d]=polygon[j];if((b>z)!==(d>z)&&x<(c-a)*(z-b)/(d-b)+a)hit=!hit;}return hit;}
/** Deliberate backdrop interpolation, never exposed as gameplay/native support. */
export function makeBackdropHeight(samples,maxDistance=160){
 const bins=new Map(),cache=new Map(),size=16;
 for(const p of samples){const key=`${Math.floor(p.x/size)}:${Math.floor(p.z/size)}`,bin=bins.get(key)??[];bin.push(p);bins.set(key,bin);}
 return(x,z)=>{const key=`${x}:${z}`;if(cache.has(key))return cache.get(key);const bx=Math.floor(x/size),bz=Math.floor(z/size);let candidates=[];
  for(let radius=1;radius<=Math.ceil(maxDistance/size)+1;radius++){
   for(let dx=-radius;dx<=radius;dx++)for(let dz=-radius;dz<=radius;dz++){if(radius>1&&Math.abs(dx)<radius&&Math.abs(dz)<radius)continue;for(const p of bins.get(`${bx+dx}:${bz+dz}`)??[])candidates.push({...p,d:(p.x-x)**2+(p.z-z)**2});}
   if(candidates.length>=8)break;
  }
  const near=candidates.sort((a,b)=>a.d-b.d).slice(0,8);if(!near.length||near[0].d>maxDistance**2)return;
  if(near[0].d<.0001)return near[0].y;let sum=0,weight=0;for(const p of near){const w=1/Math.max(.01,p.d);sum+=p.y*w;weight+=w;}const y=sum/weight;cache.set(key,y);return y;};
}
export function dressingPointAllowed(x,z,radius,dressing,polygon,forest=false){
 if(forest&&(inside(x,z,polygon)||polygon.some((p,i)=>segmentDistance(x,z,p,polygon[(i+1)%polygon.length])<radius+2)))return false;
 if((dressing.corridors??[]).some(c=>c.segments.some(([a,b])=>segmentDistance(x,z,a,b)<c.halfWidth+radius)))return false;
 for(const l of dressing.buildingKeepouts??[]){const dx=x-l.x,dz=z-l.z,c=Math.cos(l.yaw??0),s=Math.sin(l.yaw??0),lx=c*dx-s*dz,lz=s*dx+c*dz;if(Math.abs(lx)<l.width/2+radius+1&&Math.abs(lz)<l.depth/2+radius+1)return false;
  const world=(px,pz)=>[l.x+(px-l.x)*c+(pz-l.z)*s,l.z-(px-l.x)*s+(pz-l.z)*c];
  if(Number.isFinite(l.doorX)&&Number.isFinite(l.rampStart)&&segmentDistance(x,z,world(l.doorX,l.front),world(l.doorX,l.rampStart))<(l.doorWidth??2)/2+radius+1)return false;
 }
 return true;
}
export async function buildDressing({publish=true,outputDir=live,sourceRoot=root}={}){
 const require=createRequire(await realpath(resolve(root,'node_modules/@gltf-transform/cli/package.json'))),{NodeIO,Document}=require('@gltf-transform/core'),io=new NodeIO();
 const raw=await readFile(dressingPath),dressing=JSON.parse(raw),manifestPath=resolve(live,'rdo_world_manifest.json'),manifest=JSON.parse(await readFile(manifestPath));
 const {source:nativeGround}=await loadNativeTerrainSurface(io,manifest,live,{minNormalY:.65});
 const samples=JSON.parse(await readFile(resolve(root,'data/runtime/valentine/area-expansion-2026-10-19/height-samples.json'))),height=makeDressingHeightSampler(samples,nativeGround),backdropHeight=makeBackdropHeight(samples),farBackdropHeight=makeBackdropHeight(samples,450),anchors=resolveDressingAnchors(dressing,manifest);
 const polygon=JSON.parse(await readFile(resolve(root,'data/reference/valentine/playable-boundary.json'))).polygon;
 dressing.buildingKeepouts=[];
 const registry=JSON.parse(await readFile(resolve(root,'data/reference/valentine/buildings/registry.json')));
 for(const b of registry.buildings){const path=resolve(root,'data/reference/valentine/buildings',b.file),building=JSON.parse(await readFile(path));for(const f of building.interior?.floorDefinitions??[]){const floor=JSON.parse(await readFile(resolve(dirname(path),f.file)));if(floor.layout)dressing.buildingKeepouts.push(floor.layout);}}
 const doc=new Document(),buffer=doc.createBuffer(),scene=doc.createScene(),origin={x:-300,y:0,z:-780},groups=new Map(),placements=[],skipped=[];
 const foliageQuality={townCardsPerBranch:32,forestCardsPerBranch:20,forestTiers:8,cardSides:3,...dressing.treeAppearance?.budget};
 if(![foliageQuality.townCardsPerBranch,foliageQuality.forestCardsPerBranch].every(n=>Number.isInteger(n)&&n>0&&n<=64)||!Number.isInteger(foliageQuality.cardSides)||foliageQuality.cardSides<3||foliageQuality.cardSides>5)throw new Error('Invalid foliage geometry budget');
 let generatedTriangles=0;
 const textures={};
 for(const [key,t]of Object.entries(dressing.textures)){let bytes;try{bytes=await readFile(resolve(live,t.url));}catch{bytes=await readFile(resolve(sourceRoot,t.source));}textures[key]=doc.createTexture(key).setImage(bytes).setMimeType('image/png').setExtras({source:t.source,usage:t.usage});}
 for(const key of ['leaves','pine']){const bytes=await require('sharp')(Buffer.from(foliageSvg(key==='pine'))).png().toBuffer();textures[key]=doc.createTexture(`authored-${key}-branch`).setImage(bytes).setMimeType('image/png').setExtras({classification:'authored-gameplay',source:'scripts/authored-foliage.mjs'});}
 const material=(name,texture,color=[1,1,1,1],metal=0)=>doc.createMaterial(name).setBaseColorTexture(texture??null).setBaseColorFactor(color).setMetallicFactor(metal).setRoughnessFactor(.9);
 const mats={ground:material('authored-decorative-background-ground',textures.grass,[.9,.95,.8,1]),wood:material('authored-original-timber-albedo',textures.wood),bark:material('authored-timber-albedo-bark-adaptation',textures.wood,[.30,.22,.14,1]),iron:material('authored-iron',null,[.18,.19,.21,1],.5),lamp:material('authored-lantern',null,[.98,.9,.65,1]).setEmissiveFactor([.5,.36,.16]),barrel:material('authored-original-barrel-albedo',textures.barrel),leaves:material('authored-ground-leaf-albedo-crown',textures.leaves,[.65,.82,.46,1]),pine:material('authored-ground-grass-albedo-needle-clusters',textures.grass,[.45,.62,.4,1])};
 function add(key,geometry,x,y,z,scale=[1,1,1],rotation=new Quaternion()){
  const g=geometry.index?geometry.toNonIndexed():geometry;g.scale(...scale).applyQuaternion(rotation).translate(x-origin.x,y,z-origin.z);generatedTriangles+=g.attributes.position.count/3;const groupKey=key==='ground'?key:`${key}@${Math.floor(x/32)}:${Math.floor(z/32)}`;const group=groups.get(groupKey)??{p:[],n:[],uv:[]};for(const [out,a]of [[group.p,g.attributes.position.array],[group.n,g.attributes.normal.array],[group.uv,g.attributes.uv.array]])for(let i=0;i<a.length;i+=16384)out.push(...a.subarray(i,i+16384));groups.set(groupKey,group);if(g!==geometry)geometry.dispose();g.dispose();
 }
 const box=(key,x,y,z,sx,sy,sz)=>add(key,new BoxGeometry(sx,sy,sz),x,y,z);
 const cylinder=(key,x,y,z,rt,rb,h)=>add(key,makeDressingCylinder(rt,rb,h),x,y,z);
 function branch(x,y,z,tx,ty,tz,r){const a=new Vector3(x,y,z),b=new Vector3(tx,ty,tz),d=b.clone().sub(a);add('bark',makeDressingCylinder(r*.45,r,d.length()),(x+tx)/2,(y+ty)/2,(z+tz)/2,[1,1,1],new Quaternion().setFromUnitVectors(new Vector3(0,1,0),d.normalize()));}
 for(const key of ['leaves','pine'])mats[key].setBaseColorTexture(textures[key]).setBaseColorFactor([1,1,1,1]).setAlphaMode('MASK').setAlphaCutoff(.35).setDoubleSided(true);
 function tree(x,y,z,scale,seed,pine){
  const h=(pine?12:9)*scale;cylinder('bark',x,y+h*.38,z,.12*scale,.32*scale,h*.76);
  const tiers=pine?foliageQuality.forestTiers:4;
  for(let t=0;t<tiers;t++){const u=t/Math.max(1,tiers-1),cy=y+h*(pine?.31+u*.57:.31+t*.13),spread=(pine?(3.1-u*2.24):(2.7-Math.abs(t-1)*.4))*scale;for(let b=0;b<5;b++){const a=b*Math.PI*2/5+t*.72+seed*.4,reach=spread*(.82+((b+t)%3)*.09),tx=x+Math.cos(a)*reach,tz=z+Math.sin(a)*reach;branch(x,cy-.5*scale,z,tx,cy,tz,.065*scale);// Separate overlapping leaf/needle cards preserve gaps and a ragged silhouette,
   // rather than covering the tree with opaque solid balls or cones.
   for(let leaf=0;leaf<(pine?foliageQuality.forestCardsPerBranch:foliageQuality.townCardsPerBranch);leaf++){const u=((leaf*37+b*11+t*7)%67)/67,v=((leaf*23+b*7)%71)/71,angle=leaf*2.399963+seed;
    const radial=Math.sqrt(u),cx=tx+Math.cos(angle)*radial*reach*.64,cz=tz+Math.sin(angle)*radial*reach*.64,ly=cy+(v-.5)*(pine?.85:2.15)*scale;
    const size=pine?Math.sqrt(12/foliageQuality.forestCardsPerBranch):1;
    const tilt=new Quaternion().setFromEuler(new Euler(.5+u*2.1,angle,v*3.1));add(pine?'pine':'leaves',new PlaneGeometry(1,1),cx,ly,cz,[(pine?1.55*size:1.15)*scale,(pine?.85*size:1.35)*scale,1],tilt);
   }}}
 }
 function place(item,x,z,forest=false){const scale=item.scale??1,radius=item.kind==='tree'?3.4*scale:item.kind==='water-tower'?3.3:.5;if(!dressingPointAllowed(x,z,radius,dressing,polygon,forest)){skipped.push({id:item.id,reason:'road/building/entrance/boundary clearance',x,z});return;}const y=item.nativeGroundOnly?nativeGround(x,z):height(x,z)??(forest&&item.authoredBackdrop?backdropHeight(x,z):undefined);if(y===undefined){skipped.push({id:item.id,reason:item.nativeGroundOnly?'no native walkable terrain triangle':'no allowed source/backdrop height',x,z});return;}placements.push({id:item.id,kind:item.kind,x,y,z,forest,grounding:nativeGround(x,z)!==undefined?'native':'authored-interpolation',classification:'authored-gameplay'});
  if(item.kind==='tree'){const before=generatedTriangles;tree(x,y-.06,z,scale,placements.length,forest||item.species==='pine');placements.at(-1).scale=scale;placements.at(-1).triangles=generatedTriangles-before;return;}
  if(item.kind==='barrel'){cylinder('barrel',x,y+.48,z,.3,.35,.96);for(const v of [.2,.72])cylinder('iron',x,y+v,z,.355,.355,.045);return;}
  if(item.kind==='streetlamp'){cylinder('wood',x,y+2,z,.11,.13,4);const yaw=item.yaw??0,ax=x+Math.cos(yaw)*.45,az=z+Math.sin(yaw)*.45;branch(x,y+3.8,z,ax,y+3.8,az,.06);cylinder('lamp',ax,y+3.5,az,.18,.12,.35);cylinder('iron',ax,y+3.75,az,0,.22,.2);return;}
  if(item.kind==='telegraph-pole'){cylinder('wood',x,y+3.6,z,.12,.16,7.2);box('wood',x,y+6.8,z,1.8,.12,.14);box('wood',x,y+6.1,z,1.4,.12,.14);return;}
 }
 for(const item of dressing.placements){const a=anchors.get(item.anchor);if(!a)throw new Error(`Unknown dressing anchor ${item.anchor}`);place(item,a.x+(item.offset?.[0]??0),a.z+(item.offset?.[1]??0));}
 for(const [gi,g]of dressing.forestGroves.entries()){const a=anchors.get(g.anchor);if(!a)throw new Error(`Unknown grove anchor ${g.anchor}`);for(let r=0;r<g.rows;r++)for(let c=0;c<g.columns;c++){place({id:`grove-${gi}-${r}-${c}`,kind:'tree',scale:.85+(r+c)%4*.13,nativeGroundOnly:g.nativeGroundOnly===true,authoredBackdrop:g.authoredBackdrop===true},a.x+(c-(g.columns-1)/2)*g.spacing+((r*13+c*7)%7)-3,a.z+(r-(g.rows-1)/2)*g.spacing+((r*5+c*11)%7)-3,true);}}
 for(const [zi,zone]of(dressing.townTreeZones??[]).entries()){let index=0;for(let x=zone.bounds[0];x<=zone.bounds[1];x+=zone.spacing)for(let z=zone.bounds[2];z<=zone.bounds[3];z+=zone.spacing){const i=index++,r=((i*37+zi*71)%101)/101;if(r>zone.density)continue;const px=x+((i*17)%7)-3,pz=z+((i*29)%7)-3;if(!inside(px,pz,polygon))continue;place({id:`town-zone-${zi}-${i}`,kind:'tree',species:(i+zi)%3?'pine':'broadleaf',scale:.8+(i%5)*.11,nativeGroundOnly:true},px,pz);}}
 // Sparse clipped background tiles only beyond the confirmed gameplay border.
 // No native triangle is covered, and role:dressing forbids ground support.
 if(dressing.decorativeBackdrop){const {BufferGeometry,Float32BufferAttribute}=createRequire(new URL('../apps/client/package.json',import.meta.url))('three');
  const {source:nativeRender}=await loadNativeTerrainSurface(io,manifest,live),renderHeight=makeHeightSampler(samples,nativeRender);
  const xs=polygon.map(p=>p[0]),zs=polygon.map(p=>p[1]),xmin=Math.min(...xs)-200,xmax=Math.max(...xs)+200,zmin=Math.min(...zs)-200,zmax=Math.max(...zs)+200;
  const covered=(x,z)=>nativeRender(x,z)??(inside(x,z,polygon)?renderHeight(x,z):undefined);
  const gap=makeGapSurface([{x:xmin,z:zmin},{x:xmax,z:zmin},{x:xmax,z:zmax},{x:xmin,z:zmax}],covered,(x,z)=>nativeRender(x,z)??farBackdropHeight(x,z)??120,4);
  const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(gap.positions,3));g.setAttribute('uv',new Float32BufferAttribute(gap.uv,2));g.computeVertexNormals();add('ground',g,0,0,0);
  // Continuous underlay closes sub-pixel gaps and the former abrupt terrain edge.
  // It sits below nearby native surfaces and never participates in gameplay support.
  const positions=[],uv=[],bed=(x,z)=>{let low=Infinity;for(const[dx,dz]of[[0,0],[-8,0],[8,0],[0,-8],[0,8]]){const px=x+dx,pz=z+dz,h=nativeRender(px,pz)??(inside(px,pz,polygon)?renderHeight(px,pz):undefined);if(h!==undefined)low=Math.min(low,h);}return(Number.isFinite(low)?low:farBackdropHeight(x,z)??120)-2.5;};
  for(let x=xmin;x<xmax;x+=8)for(let z=zmin;z<zmax;z+=8){for(const[px,pz]of[[x,z],[x,z+8],[x+8,z+8],[x,z],[x+8,z+8],[x+8,z]]){positions.push(px,bed(px,pz),pz);uv.push(px/4,pz/4);}}
  const underlay=new BufferGeometry();underlay.setAttribute('position',new Float32BufferAttribute(positions,3));underlay.setAttribute('uv',new Float32BufferAttribute(uv,2));underlay.computeVertexNormals();add('ground',underlay,0,0,0);
 }
 // Preserve the existing authored station water-tank adaptation, with grounded support.
 const wt=dressing.waterTower;if(wt){const a=anchors.get(wt.anchor),x=a.x+wt.offset[0],z=a.z+wt.offset[1],y=height(x,z);if(y!==undefined&&dressingPointAllowed(x,z,3.3,dressing,polygon)){for(const dx of [-1.4,1.4])for(const dz of [-1.4,1.4])cylinder('wood',x+dx,y+2.4,z+dz,.18,.22,4.8);cylinder('barrel',x,y+6.8,z,2.3,2.3,3.6);cylinder('wood',x,y+9.5,z,0,2.6,1.8);for(const h of [5.5,6.7,7.9,8.4])cylinder('iron',x,y+h,z,2.35,2.35,.08);}}
 for(const [key,g]of groups){if(key==='ground')continue;const base=mats[key.split('@')[0]],cellMaterial=doc.createMaterial(key).setBaseColorTexture(base.getBaseColorTexture()).setBaseColorFactor(base.getBaseColorFactor()).setRoughnessFactor(base.getRoughnessFactor()).setMetallicFactor(base.getMetallicFactor()).setEmissiveFactor(base.getEmissiveFactor()).setDoubleSided(base.getDoubleSided()).setAlphaMode(base.getAlphaMode()).setAlphaCutoff(base.getAlphaCutoff());const prim=doc.createPrimitive().setMaterial(cellMaterial);for(const [name,type,a]of [['POSITION','VEC3',g.p],['NORMAL','VEC3',g.n],['TEXCOORD_0','VEC2',g.uv]])prim.setAttribute(name,doc.createAccessor().setType(type).setArray(new Float32Array(a)).setBuffer(buffer));scene.addChild(doc.createNode(`dressing_${key}`).setMesh(doc.createMesh(key).addPrimitive(prim)));}
 doc.getRoot().setExtras({classification:'authored-gameplay',sourceConfigSha256:createHash('sha256').update(raw).digest('hex'),limitations:['Own branch/leaf cutout sprites and tree geometry; not recovered original tree assets.','Explicit unreachable backdrop may interpolate to 160m; no native or gameplay terrain claim. Town props retain 32m/native-only gates.','Source fence placements unchanged; own stable fence supplement separate.']});
 const asset='models/authored/valentine-dressing.glb';await mkdir(dirname(resolve(outputDir,asset)),{recursive:true});await io.write(resolve(outputDir,asset),doc);
 const backdropAsset='models/authored/valentine-backdrop-ground.glb';
 if(groups.has('ground')){const g=groups.get('ground'),bd=new Document(),bb=bd.createBuffer(),bs=bd.createScene(),texture=bd.createTexture('ground').setImage(textures.grass.getImage()).setMimeType('image/png'),material=bd.createMaterial('decorative-ground').setBaseColorTexture(texture).setBaseColorFactor([.9,.95,.8,1]).setRoughnessFactor(1),primitive=bd.createPrimitive().setMaterial(material);
  const tiles=new Map();for(let i=0;i<g.p.length;i+=9){const x=(g.p[i]+g.p[i+3]+g.p[i+6])/3+origin.x,z=(g.p[i+2]+g.p[i+5]+g.p[i+8])/3+origin.z,key=`${Math.floor(x/64)}:${Math.floor(z/64)}`,tile=tiles.get(key)??{p:[],n:[],uv:[]};tile.p.push(...g.p.slice(i,i+9));tile.n.push(...g.n.slice(i,i+9));tile.uv.push(...g.uv.slice(i/3*2,i/3*2+6));tiles.set(key,tile);}for(const[key,tile]of tiles){const primitive=bd.createPrimitive().setMaterial(material);for(const[name,type,a]of[['POSITION','VEC3',tile.p],['NORMAL','VEC3',tile.n],['TEXCOORD_0','VEC2',tile.uv]])primitive.setAttribute(name,bd.createAccessor().setType(type).setArray(new Float32Array(a)).setBuffer(bb));bs.addChild(bd.createNode(`background-${key}`).setMesh(bd.createMesh().addPrimitive(primitive)));}bd.getRoot().setExtras({classification:'authored-gameplay',support:false,source:'explicit decorative interpolation outside confirmed polygon'});await io.write(resolve(outputDir,backdropAsset),bd);
 }
 const fenceAudit=[];for(const p of manifest.placements.filter(p=>/fence/.test(p.asset))){const fd=await io.read(resolve(live,p.asset)),matrix=new Matrix4().compose(new Vector3(p.position.x,p.position.y,p.position.z),new Quaternion().setFromEuler(new Euler(p.rotation.x,p.rotation.y,p.rotation.z)),new Vector3(p.scale.x,p.scale.y,p.scale.z));let min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity],vertices=0,textured=0;for(const n of fd.getRoot().listNodes()){const world=matrix.clone().multiply(new Matrix4().fromArray(n.getWorldMatrix()));for(const prim of n.getMesh()?.listPrimitives()??[]){if(prim.getMaterial()?.getBaseColorTexture())textured++;const a=prim.getAttribute('POSITION');if(!a)continue;for(let i=0;i<a.getCount();i++){const q=new Vector3().fromArray(a.getArray(),i*3).applyMatrix4(world);min=min.map((v,j)=>Math.min(v,q.getComponent(j)));max=max.map((v,j)=>Math.max(v,q.getComponent(j)));vertices++;}}}const ground=height((min[0]+max[0])/2,(min[2]+max[2])/2);fenceAudit.push({id:p.id,asset:p.asset,min,max,vertices,texturedPrimitives:textured,groundAtBoundsCenter:ground,bottomAboveCenterGround:ground===undefined?null:min[1]-ground});}
 const report={at:new Date().toISOString(),classification:'authored-gameplay',placements,skipped,counts:Object.fromEntries(['tree','barrel','streetlamp','telegraph-pole'].map(k=>[k,placements.filter(p=>p.kind===k).length])),foliageQuality,treeTriangles:placements.filter(p=>p.kind==='tree').reduce((total,p)=>total+p.triangles,0),textures:doc.getRoot().listTextures().length,triangles:[...groups.values()].reduce((n,g)=>n+g.p.length/9,0),fenceAudit,limitations:doc.getRoot().getExtras().limitations};await writeFile(resolve(outputDir,'dressing-report.json'),JSON.stringify(report,null,2));
 const cd=new Document(),cb=cd.createBuffer(),cs=cd.createScene(),cp=[],cn=[],colliders=[];
 for(const p of placements.filter(p=>!p.forest&&inside(p.x,p.z,polygon))){const tree=p.kind==='tree',r=tree?.32*(p.scale??1):p.kind==='barrel'?.36:.18,h=tree?2.3:p.kind==='barrel'?.95:2.4,g=makeDressingCylinder(r,r,h).toNonIndexed();g.translate(p.x-origin.x,p.y+h/2,p.z-origin.z);cp.push(...g.attributes.position.array);cn.push(...g.attributes.normal.array);g.dispose();colliders.push({id:p.id,x:p.x,y:p.y,z:p.z,radius:r,height:h});}
 const cm=cd.createMaterial('simple-trunk-and-prop-collision').setDoubleSided(true),primitive=cd.createPrimitive().setMaterial(cm);for(const[name,a]of[['POSITION',cp],['NORMAL',cn]])primitive.setAttribute(name,cd.createAccessor().setType('VEC3').setArray(new Float32Array(a)).setBuffer(cb));cs.addChild(cd.createNode('narrow-trunks-no-canopy-collision').setMesh(cd.createMesh().addPrimitive(primitive)));cd.getRoot().setExtras({classification:'authored-gameplay',support:false,canopyCollision:false});const collisionAsset='models/authored/valentine-dressing-collision.glb';await io.write(resolve(outputDir,collisionAsset),cd);report.colliders=colliders;await writeFile(resolve(outputDir,'dressing-report.json'),JSON.stringify(report,null,2));
 if(publish){const p={id:'authored:valentine-dressing-2026-10-21',asset,position:origin,rotation:{x:0,y:0,z:0},scale:{x:1,y:1,z:1},layer:'buildings',chunkId:'-2:-4',lod:0,tags:['authored-gameplay','role:dressing','collision:none']},background={...p,id:'authored:valentine-backdrop-ground',asset:backdropAsset,tags:[...p.tags,'occlusion:none']},physics={...p,id:'authored:valentine-dressing-collision',asset:collisionAsset,tags:['authored-gameplay','role:dressing','render:physics-only','occlusion:none']};await writeFile(manifestPath,JSON.stringify({...manifest,placements:[...manifest.placements.filter(q=>![p.id,background.id,physics.id].includes(q.id)),p,physics,...(groups.has('ground')?[background]:[])]},null,2));}
 console.log(JSON.stringify({publish,outputDir,counts:report.counts,skipped:skipped.length,textures:report.textures,triangles:report.triangles}));return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const candidate=process.argv.includes('--candidate');const sourceArg=process.argv.indexOf('--source-root');await buildDressing({sourceRoot:sourceArg>=0?resolve(process.argv[sourceArg+1]):root,publish:!candidate,outputDir:candidate?resolve(root,'data/runtime/valentine/dressing-candidate-2026-10-24'):live});}
