/** Reproducible authored gameplay adaptation; original GLBs remain unchanged. */
import {readFile,writeFile,mkdir,realpath} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {loadNativeTerrainSurface,makeHeightSampler} from './prepare-authored-landscape.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),live=resolve(root,'data/runtime/valentine/verified-scene');
const require=createRequire(await realpath(resolve(root,'node_modules/@gltf-transform/cli/package.json'))),{Document,NodeIO}=require('@gltf-transform/core');
const {BoxGeometry,CylinderGeometry,TorusGeometry,BufferGeometry,Float32BufferAttribute,Matrix4,Euler,Quaternion,Vector3}=createRequire(new URL('../apps/client/package.json',import.meta.url))('three');
const io=new NodeIO(),manifestPath=resolve(live,'rdo_world_manifest.json'),manifest=JSON.parse(await readFile(manifestPath));
const {source}=await loadNativeTerrainSurface(io,manifest,live,{minNormalY:.65});
const height=makeHeightSampler(JSON.parse(await readFile(resolve(root,'data/runtime/valentine/area-expansion-2026-10-19/height-samples.json'))),source);
const buildingPath=resolve(root,'data/reference/valentine/buildings/val-03-stable-ext/building.json');
const c={x:-369.1,z:-789.4,width:19,depth:15,floorY:115.6,front:-781.9,doorX:-369.1,doorWidth:3.8,rampStart:-776.9,frontDirection:1,yaw:Math.PI/2+4*Math.PI/180,wallHeight:4.5};
const world=(x,z)=>({x:c.x+(x-c.x)*Math.cos(c.yaw)+(z-c.z)*Math.sin(c.yaw),z:c.z-(x-c.x)*Math.sin(c.yaw)+(z-c.z)*Math.cos(c.yaw)});
const foot=world(c.doorX,c.rampStart);c.rampLow=height(foot.x,foot.z);
// Keep a clear central aisle; fixtures include their own sole collision boxes.
const fixture=(id,kind,dx,dz,w,h,d,collision=true,yaw=0)=>({id,kind,position:{x:c.x+dx,y:c.floorY,z:c.z+dz},size:{x:w,y:h,z:d},yaw,color:'#9a8060',collision});
c.fixtures=[fixture('dealer-counter','desk',-5,4.0,3,.95,1.2),fixture('horse-dealer','npc-clerk',-5,2.9,.65,1.8,.6,false),fixture('tack-cabinet','goods-shelf',-7,-5,2.5,2.3,.8),fixture('feed-crates','crate-stack',7,-5,2,1.4,1.8)];
for(const side of [-1,1])for(let row=0;row<3;row++){
 const x=side*6,z=-4+row*3.5;
 c.fixtures.push(fixture(`stall-${side}-${row}`,'stall-divider',x,z,5,1.6,.16,true),fixture(`trough-${side}-${row}`,'trough',side*8,z+1.1,1,0.7,1.6,true));
}
c.appearance={textures:{floor:{url:'interiors/authored-reference/textures/val_sal2_woodplank03_ab.png',repeat:[14,12]},wood:{url:'interiors/authored-reference/textures/val_sal2_woodplank03_ab.png'},wallpaper:{url:'interiors/authored-reference/textures/val_sal2_woodplank03_ab.png'},furnitureWood:{url:'interiors/authored-reference/textures/val_sal2_woodplank03_ab.png'}}};
await mkdir(resolve(dirname(buildingPath),'floors'),{recursive:true});
await writeFile(resolve(dirname(buildingPath),'floors/ground.json'),JSON.stringify({schemaVersion:1,id:'ground',label:'Livery · Pferdehändler und Boxengasse',status:'built-pilot',layout:c,alignmentEvidence:{classification:'authored-gameplay',source:'rollout-source-measurements.json#val-03-stable-ext',note:'Simplified source-bounded barn. East entrance adapted toward measured street; not an original interior claim.',terrainFoot:foot},designStatus:'Textured barn, six stall divisions, troughs, tack and feed storage, dealer; central entrance/aisle clear.'},null,2));
const building=JSON.parse(await readFile(buildingPath));building.interior.coverage='ground-floor-pilot';building.interior.floorDefinitions=[{id:'ground',file:'floors/ground.json'}];building.interior.recognitionFeatures=['wide barn aisle','wooden horse stalls','tack and feed','horse dealer'];
const dealerStand={x:c.x-5,z:c.z+5.4};
building.actions=[{id:'horse-dealer',kind:'game',label:'Pferdehändler ansprechen',gameId:'horse-race',variantId:'stable-menu',floorId:'ground',position:{...dealerStand,y:c.floorY+1},interactionPosition:{...dealerStand,y:c.floorY},radius:2.3,anchorStatus:'authored-gameplay'}];
await writeFile(buildingPath,JSON.stringify(building,null,2));
const config=JSON.parse(await readFile(resolve(root,'data/reference/valentine/north-environment.json')));
const receipts=[];
async function build(name,draw,tags){
 const doc=new Document(),buffer=doc.createBuffer(),scene=doc.createScene(),groups=new Map(),mats={};let part="";
 for(const [key,t]of Object.entries(config.textures)){const bytes=await readFile(resolve('D:/Projects/RDO-RPG',t.source)).catch(()=>readFile(resolve(live,t.url??'textures/terrain/hea_grass_val_01_abte.png'))),tex=doc.createTexture(key).setImage(bytes).setMimeType('image/png');mats[key]=doc.createMaterial(key).setBaseColorTexture(tex).setRoughnessFactor(.95).setDoubleSided(true);receipts.push({source:t.source,sha256:createHash('sha256').update(bytes).digest('hex'),usage:t.usage});}
 mats.canvasGreen=doc.createMaterial('weathered-green-canvas').setBaseColorTexture(mats.canvas.getBaseColorTexture()).setBaseColorFactor([.35,.55,.35,1]).setRoughnessFactor(1).setDoubleSided(true);
 const signImage=await require('sharp')(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="128"><rect width="1024" height="128" fill="#3c2a1d"/><rect x="8" y="8" width="1008" height="112" fill="none" stroke="#b7a17b" stroke-width="5"/><text x="512" y="91" text-anchor="middle" font-family="Georgia,serif" font-weight="bold" font-size="78" fill="#e1cda4">VALENTINE LIVERY</text></svg>')).png().toBuffer();mats.sign=doc.createMaterial('authored-livery-sign').setBaseColorTexture(doc.createTexture('authored-livery-lettering').setImage(signImage).setMimeType('image/png')).setRoughnessFactor(1);
 mats.iron=doc.createMaterial('iron').setBaseColorFactor([.13,.12,.10,1]).setMetallicFactor(.6).setRoughnessFactor(.7);
 const add=(key,g,x,y,z,rotation=[0,0,0])=>{const non=g.index?g.toNonIndexed():g;non.applyMatrix4(new Matrix4().compose(new Vector3(x,y,z),new Quaternion().setFromEuler(new Euler(...rotation)),new Vector3(1,1,1)));const groupKey=part?part+"|"+key:key;const bucket=groups.get(groupKey)??{p:[],n:[],uv:[]};for(const [k,a]of [['p','position'],['n','normal'],['uv','uv']])bucket[k].push(...non.getAttribute(a).array);groups.set(groupKey,bucket);if(non!==g)g.dispose();non.dispose();};
 const box=(key,x,y,z,w,h,d,rot)=>{const g=new BoxGeometry(w,h,d);if(['wood','trim'].includes(key)){const p=g.getAttribute('position'),n=g.getAttribute('normal'),uv=g.getAttribute('uv');for(let i=0;i<p.count;i++){const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i));uv.setXY(i,(nx>.5?p.getZ(i):p.getX(i))/1.2,(ny>.5?p.getZ(i):p.getY(i))/1.2);}}add(key,g,x,y,z,rot);};
 const beam=(key,a,b,r=.07)=>{const v=new Vector3(...b).sub(new Vector3(...a));const g=new CylinderGeometry(r,r,v.length(),6);g.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0,1,0),v.normalize()));add(key,g,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);};
 const face=(key,points)=>{const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(points.flat(),3));g.setAttribute('uv',new Float32BufferAttribute(points.map((_,i)=>[[0,0],[1,0],[1,1],[0,1]][i]).flat(),2));g.setIndex([0,1,2,...(points.length===4?[0,2,3]:[])]);g.computeVertexNormals();if(['roof','wood'].includes(key)){const w=Math.hypot(...points[1].map((v,i)=>v-points[0][i]))/2,d=Math.hypot(...points.at(-1).map((v,i)=>v-points[0][i]))/2,uv=g.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*w,uv.getY(i)*d);}add(key,g,0,0,0);};
 await draw({box,beam,face,add,beginPart:name=>{part=name;}});
 for(const [key,b]of groups){const base=key.split('|').at(-1),sourceMaterial=mats[base],material=key.includes('|')?doc.createMaterial(key).setBaseColorTexture(sourceMaterial.getBaseColorTexture()).setBaseColorFactor(sourceMaterial.getBaseColorFactor()).setMetallicFactor(sourceMaterial.getMetallicFactor()).setRoughnessFactor(sourceMaterial.getRoughnessFactor()).setDoubleSided(true):sourceMaterial;const p=doc.createPrimitive().setMaterial(material);for(const [name,type,a]of [['POSITION','VEC3',b.p],['NORMAL','VEC3',b.n],['TEXCOORD_0','VEC2',b.uv]])p.setAttribute(name,doc.createAccessor().setType(type).setArray(new Float32Array(a)).setBuffer(buffer));scene.addChild(doc.createNode(name+'-'+key).setMesh(doc.createMesh().addPrimitive(p)));}
 doc.getRoot().setExtras({classification:'authored-gameplay',config:'data/reference/valentine/north-environment.json',originalGeometryClaim:false});
 const asset=`models/authored/${name}.glb`;await mkdir(dirname(resolve(live,asset)),{recursive:true});if(tags.includes('render:physics-only'))for(const mesh of doc.getRoot().listMeshes())for(const p of mesh.listPrimitives())p.getMaterial()?.setBaseColorTexture(null);await doc.transform(require('@gltf-transform/functions').prune());await io.write(resolve(live,asset),doc);
 const id=`authored:${name}:2026-10-24`,p={id,asset,position:{x:0,y:0,z:0},rotation:{x:0,y:0,z:0},scale:{x:1,y:1,z:1},layer:'buildings',chunkId:'-2:-4',lod:0,tags:['authored-gameplay','role:dressing',...tags]};manifest.placements=manifest.placements.filter(q=>q.id!==id);manifest.placements.push(p);
 return{asset,triangles:[...groups.values()].reduce((n,g)=>n+g.p.length/9,0)};
}
const shell=await build('livery-adaptation',async({box,face})=>{
 const b=(key,x,y,z,w,h,d,rot=[0,0,0])=>{const p=world(c.x+x,c.z+z);box(key,p.x,y,p.z,w,h,d,[rot[0],c.yaw+rot[1],rot[2]]);};
 const y=c.floorY,w=c.width/2,d=c.depth/2;
 for(const s of [-1,1])b('wood',s*w,y+2.25,0,.2,4.5,c.depth);
 b('wood',0,y+2.25,-d,c.width,4.5,.2);
 for(const s of [-1,1])b('wood',s*(w+c.doorWidth/2)/2,y+2.25,d,w-c.doorWidth/2,4.5,.2);
 b('wood',0,y+4,d,c.doorWidth,1,.2);
 // Gabled roof, .25m eaves. Exported geometry is visual only; authored room owns collision.
 for(const s of [-1,1]){const x1=s*(w+.25),pts=[[0,y+7,-d-.25],[x1,y+4.5,-d-.25],[x1,y+4.5,d+.25],[0,y+7,d+.25]].map(([x,py,z])=>{const p=world(c.x+x,c.z+z);return[p.x,py,p.z];});face('roof',pts);}
 for(const z of [-d,d]){const pts=[[-w,y+4.5,z],[w,y+4.5,z],[0,y+7,z]].map(([x,py,z])=>{const p=world(c.x+x,c.z+z);return[p.x,py,p.z];});face('wood',pts);}
 for(const x of [-w,-c.doorWidth/2,c.doorWidth/2,w])b('trim',x,y+2.2,d+.12,.18,4.4,.18);
 // Open sliding door leaves and a timber sign backing.
 for(const s of [-1,1])b('trim',s*3.5,y+1.7,d+.19,2.7,3.4,.12);
 b('sign',0,y+4.6,d+.16,7,.85,.15);
 for(const side of[-1,1]){for(const z of[-d,0,d])b('trim',side*w,y+2.2,z,.22,4.4,.2);b('trim',side*w,y+4.45,0,.28,.18,c.depth+.3);}
},['collision:none']);
const fences=await build('livery-yard-fences',async({box,beam})=>{
 for(const [a,b]of config.stableYardFenceSegments){const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/2.5);for(let i=0;i<n;i++){
  const ax=a[0]+(b[0]-a[0])*i/n,az=a[1]+(b[1]-a[1])*i/n,bx=a[0]+(b[0]-a[0])*(i+1)/n,bz=a[1]+(b[1]-a[1])*(i+1)/n,ay=height(ax,az),by=height(bx,bz);
  box('wood',ax,ay+.8,az,.16,1.6,.16);if(i===n-1)box('wood',bx,by+.8,bz,.16,1.6,.16);
  for(const h of [.55,1.2])beam('wood',[ax,ay+h,az],[bx,by+h,bz],.07);
 }}
},['collision:none']);
const camp=await build('cinema-camp',async({box,beam,face,add,beginPart})=>{
 const [cx,cz]=config.camp.center;
 for(const [i,[dx,dz,w,d,h]]of config.camp.tents.entries()){
  beginPart('tent-'+i);const cloth=i===1?'canvasGreen':'canvas';const x=cx+dx,z=cz+dz,y=height(x,z);box('ground',x,y+.025,z,w+.6,.05,d+.6);
  for(const s of [-1,1])face(cloth,[[x,y+h,z-d/2],[x+s*w/2,y+.15,z-d/2],[x+s*w/2,y+.15,z+d/2],[x,y+h,z+d/2]]);
  face(cloth,[[x-w/2,y+.15,z-d/2],[x+w/2,y+.15,z-d/2],[x,y+h,z-d/2]]);
  beam('wood',[x,y,z-d/2],[x,y+h+.1,z-d/2]);beam('wood',[x,y,z+d/2],[x,y+h+.1,z+d/2]);
  for(const s of [-1,1])beam('iron',[x,y+h,z+d/2],[x+s*(w/2+.8),height(x+s*(w/2+.8),z+d/2+.6)+.1,z+d/2+.6],.015);
  box('canvas',x+.3,y+.13,z,1,.2,1.8);
 }
 for(const [i,[dx,dz]]of config.camp.wagons.entries()){beginPart('wagon-'+i);const x=cx+dx,z=cz+dz,y=height(x,z);
  box('wood',x,y+1.05,z,2.3,.35,4.2);for(const s of [-1,1])box('wood',x+s*1.08,y+1.45,z,.12,.65,4.2);
  for(const sx of [-1,1])for(const sz of [-1,1]){const wx=x+sx*1.28,wz=z+sz*1.4;add('wood',new TorusGeometry(.7,.075,5,16),wx,y+.7,wz,[0,Math.PI/2,0]);for(let i=0;i<8;i++){const a=i*Math.PI/4;beam('wood',[wx,y+.7,wz],[wx,y+.7+Math.sin(a)*.66,wz+Math.cos(a)*.66],.035);}}
  // Canvas vault on five hoops, segmented surface with real UVs.
  for(let s=0;s<8;s++){const a=Math.PI*s/8,b=Math.PI*(s+1)/8;face('canvas',[[x+1.18*Math.cos(a),y+1.5+1.25*Math.sin(a),z-2.15],[x+1.18*Math.cos(b),y+1.5+1.25*Math.sin(b),z-2.15],[x+1.18*Math.cos(b),y+1.5+1.25*Math.sin(b),z+2.15],[x+1.18*Math.cos(a),y+1.5+1.25*Math.sin(a),z+2.15]]);}
 }
 beginPart('camp-props');for(const [dx,dz]of [[-2,0],[3,-1],[6,4],[-5,5]]){const x=cx+dx,z=cz+dz,y=height(x,z);box('wood',x,y+.35,z,.8,.7,.65);for(const off of [-.3,.3])box('trim',x+off,y+.35,z+.34,.08,.75,.06);}
 beginPart('camp-table');const y=height(cx,cz);box('wood',cx,y+.8,cz,2.2,.12,1);for(const dx of [-.9,.9])for(const dz of [-.35,.35])box('wood',cx+dx,y+.4,cz+dz,.1,.8,.1);
 for(const dx of [-2,2]){box('wood',cx+dx,y+.25,cz+1.5,.55,.5,.55);}
 beginPart('camp-cookfire');const fx=cx-2,fz=cz-2,fy=height(fx,fz);for(let i=0;i<10;i++){const a=i*Math.PI/5;add('iron',new CylinderGeometry(.12,.15,.18,6),fx+Math.sin(a)*.55,fy+.06,fz+Math.cos(a)*.55);}for(const dx of[-.3,.3])beam('wood',[fx+dx,fy+.1,fz-.3],[fx-dx,fy+.12,fz+.3],.09);add('iron',new CylinderGeometry(.28,.22,.35,12),fx,fy+.7,fz);for(const [dx,dz]of[[-.65,-.45],[.65,-.45],[0,.65]])beam('wood',[fx+dx,fy,fz+dz],[fx,fy+1.7,fz],.04);
 beginPart('camp-wash-basin');add('iron',new CylinderGeometry(.4,.32,.25,12),cx+4,height(cx+4,cz+2)+.18,cz+2);
 beginPart('camp-clothesline');for(const x of [-5,5])beam('wood',[cx+x,height(cx+x,cz-3),cz-3],[cx+x,height(cx+x,cz-3)+2.2,cz-3]);beam('iron',[cx-5,y+2,cz-3],[cx+5,y+2,cz-3],.012);for(const dx of[-1,1])box('canvasGreen',cx+dx,y+1.55,cz-3,.8,.8,.025);
},['collision:none']);
const fenceCollision=await build('livery-yard-collision',async({box})=>{
 for(const[a,b]of config.stableYardFenceSegments){const count=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/2.5);for(let i=0;i<count;i++){
  const ax=a[0]+(b[0]-a[0])*i/count,az=a[1]+(b[1]-a[1])*i/count,bx=a[0]+(b[0]-a[0])*(i+1)/count,bz=a[1]+(b[1]-a[1])*(i+1)/count,ay=height(ax,az),by=height(bx,bz);
  box('wood',(ax+bx)/2,(ay+by)/2+.8,(az+bz)/2,.18,1.7+Math.abs(by-ay),Math.hypot(bx-ax,bz-az)+.04,[0,Math.atan2(bx-ax,bz-az),0]);
 }}
},['render:physics-only','occlusion:none']);
const campCollision=await build('cinema-camp-collision',async({box})=>{
 const [cx,cz]=config.camp.center;
 for(const[dx,dz,w,d,h]of config.camp.tents){const x=cx+dx,z=cz+dz,y=height(x,z);for(const side of[-1,1])box('wood',x+side*w/2,y+1,z,.1,2,d);box('wood',x,y+1,z-d/2,w,2,.1);}
 for(const[dx,dz]of config.camp.wagons){const x=cx+dx,z=cz+dz,y=height(x,z);box('wood',x,y+1.2,z,2.7,2.4,4.3);}
 for(const[dx,dz]of[[-2,0],[3,-1],[6,4],[-5,5]]){const x=cx+dx,z=cz+dz;box('wood',x,height(x,z)+.35,z,.8,.7,.65);}
 box('wood',cx,height(cx,cz)+.4,cz,2.2,.8,1);
},['render:physics-only','occlusion:none']);
const smithyLayout=JSON.parse(await readFile(resolve(root,'data/reference/valentine/buildings/smithy/floors/ground.json'))).layout;
const smithyAnnex=await build('smithy-annex',async({box,face})=>{
 const s=smithyLayout,y=s.floorY,w=s.width/2,d=s.depth/2,point=(x,z)=>({x:s.x+x*Math.cos(s.yaw)+z*Math.sin(s.yaw),z:s.z-x*Math.sin(s.yaw)+z*Math.cos(s.yaw)});
 const b=(key,x,py,z,width,height,depth)=>{const p=point(x,z);box(key,p.x,py,p.z,width,height,depth,[0,s.yaw,0]);};
 for(const side of[-1,1])b('wood',side*w,y+1.7,0,.18,3.4,s.depth);b('wood',0,y+1.7,-d,s.width,3.4,.18);
 for(const side of[-1,1])b('wood',side*(w+s.doorWidth/2)/2,y+1.7,d,w-s.doorWidth/2,3.4,.18);b('wood',0,y+3.15,d,s.doorWidth,.5,.18);
 for(const side of[-1,1]){const pts=[[0,y+5,-d-.25],[side*(w+.25),y+3.4,-d-.25],[side*(w+.25),y+3.4,d+.25],[0,y+5,d+.25]].map(([x,py,z])=>{const p=point(x,z);return[p.x,py,p.z];});face('roof',pts);}
 for(const z of[-d,d])face('wood',[[-w,y+3.4,z],[w,y+3.4,z],[0,y+5,z]].map(([x,py,z])=>{const p=point(x,z);return[p.x,py,p.z];}));
 for(const x of[-w,-s.doorWidth/2,s.doorWidth/2,w])b('trim',x,y+1.7,d+.12,.18,3.4,.18);
 b('trim',0,y+3.5,d+.1,s.width,.18,.2);
},['collision:none']);
for(const id of[building.sourcePlacementIds[0],'valentine:db9b9812f3d914d5']){const original=manifest.placements.find(p=>p.id===id);original.tags=[...new Set([...(original.tags??[]),'render:authored-replaced'])];}
await writeFile(manifestPath,JSON.stringify(manifest,null,2));
const report={classification:'authored-gameplay',shell,smithyAnnex,fences,fenceCollision,camp,campCollision,stableRampFoot:{...foot,y:c.rampLow},sources:receipts.filter((r,i,a)=>a.findIndex(t=>t.source===r.source)===i),limits:['Camp placement opposite measured cinema is authored, not surveyed original coordinates.','Race remains a local practice prototype; no authoritative mounted world racing.','Original stable and smithy GLBs/placements preserved; own non-overlapping rooms/facades replace presentation.']};
await writeFile(resolve(live,'north-environment-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
