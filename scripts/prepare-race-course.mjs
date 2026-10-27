/** Source street centre lines, authored join/width/spline and rendered surface. */
import {readFile,writeFile,realpath,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';import{fileURLToPath}from'node:url';import{createRequire}from'node:module';import{createHash}from'node:crypto';
import{loadNativeTerrainSurface,makeHeightSampler}from'./prepare-authored-landscape.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),live=resolve(root,'data/runtime/valentine/verified-scene'),out=resolve(root,'data/reference/minigames/horse-race');
const require=createRequire(await realpath(resolve(root,'node_modules/@gltf-transform/cli/package.json'))),{NodeIO,Document}=require('@gltf-transform/core'),io=new NodeIO().registerExtensions(require('@gltf-transform/extensions').ALL_EXTENSIONS);
const {CatmullRomCurve3,Vector3}=createRequire(new URL('../apps/client/package.json',import.meta.url))('three');
const manifest=JSON.parse(await readFile(resolve(live,'rdo_world_manifest.json'))),{source}=await loadNativeTerrainSurface(io,manifest,live,{minNormalY:.65});
const height=makeHeightSampler(JSON.parse(await readFile(resolve(root,'data/runtime/valentine/area-expansion-2026-10-19/height-samples.json'))),source);
const traces=JSON.parse(await readFile(resolve(root,'data/runtime/valentine/local-preview/ground-truth-traces.json'))).traces,road=id=>traces.find(t=>t.id==='valentine:road:'+id).points;
const raw=[...road('0059').slice(0,16).reverse(),...road('0060').slice(6).reverse(),...road('0062').slice(0,25),...road('0059').slice(16).reverse()].filter((p,i,a)=>!i||Math.hypot(p.x-a[i-1].x,p.z-a[i-1].z)>.8);
const curve=new CatmullRomCurve3(raw.map(p=>new Vector3(p.x,0,p.z)),true,'centripetal');
const points=curve.getSpacedPoints(Math.ceil(curve.getLength()/2)).slice(0,-1).map(p=>({x:+p.x.toFixed(3),y:+height(p.x,p.z).toFixed(3),z:+p.z.toFixed(3)}));
const course={id:'valentine-town-circuit-v1',classification:'authored-gameplay',sourceTraces:['valentine:road:0059','valentine:road:0060 (points6–13)','valentine:road:0062 (points0–24)'],adaptations:'Closed spline joins, 8m racing lane and barriers are authored. Heights sampled from source runtime; not authoritative world collision acceptance.',points};
await writeFile(resolve(out,'course.json'),JSON.stringify(course));
const doc=new Document(),buffer=doc.createBuffer(),scene=doc.createScene();
const grass=doc.createTexture('local-grass-albedo').setImage(await readFile(resolve(live,'textures/terrain/hea_grass_val_01_abte.png'))).setMimeType('image/png');
const dirt=doc.createTexture('local-road-albedo').setImage(await readFile(resolve(live,'textures/terrain/cor_dirt_dry01_abte.png'))).setMimeType('image/png');
function mesh(name,positions,uv,indices,texture,color=[1,1,1,1]){
 const material=doc.createMaterial(name).setBaseColorTexture(texture).setBaseColorFactor(color).setRoughnessFactor(1).setDoubleSided(true);material.getBaseColorTextureInfo().setWrapS(10497).setWrapT(10497);
 const p=doc.createPrimitive().setMaterial(material);for(const[n,type,a]of[['POSITION','VEC3',positions],['TEXCOORD_0','VEC2',uv]])p.setAttribute(n,doc.createAccessor().setType(type).setArray(new Float32Array(a)).setBuffer(buffer));p.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(indices)).setBuffer(buffer));scene.addChild(doc.createNode(name).setMesh(doc.createMesh().addPrimitive(p)));
}
const positions=[],uv=[],indices=[];
for(let i=0;i<=points.length;i++){const p=points[i%points.length],next=points[(i+1)%points.length],prev=points[(i+points.length-1)%points.length],dx=next.x-prev.x,dz=next.z-prev.z,n=Math.hypot(dx,dz);for(const w of [-4,4]){const x=p.x-dz/n*w,z=p.z+dx/n*w;positions.push(x,height(x,z)+.09,z);uv.push(w/4,i*.5);}if(i<points.length){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}}
mesh('racing-lane',positions,uv,indices,dirt);
const xmin=Math.min(...points.map(p=>p.x))-85,xmax=Math.max(...points.map(p=>p.x))+85,zmin=Math.min(...points.map(p=>p.z))-85,zmax=Math.max(...points.map(p=>p.z))+85,cols=Math.ceil((xmax-xmin)/3),rows=Math.ceil((zmax-zmin)/3),gp=[],gu=[],gi=[];
for(let row=0;row<=rows;row++)for(let col=0;col<=cols;col++){const x=xmin+col*3,z=zmin+row*3;gp.push(x,height(x,z)-.06,z);gu.push(x/6,z/6);if(row<rows&&col<cols){const k=row*(cols+1)+col;gi.push(k,k+cols+1,k+1,k+1,k+cols+1,k+cols+2);}}
mesh('race-terrain-adaptation',gp,gu,gi,grass);
const {normals}=require('@gltf-transform/functions');await doc.transform(normals());await mkdir(resolve(live,'minigames'),{recursive:true});await io.write(resolve(live,'minigames/race-course.glb'),doc);
const selected=['val_hotel_ext','val_genstore_ext','val_03_saloon_ext','livery-adaptation','val_bank','val_saloon2','val_05_church_ext','val_01_trainstn_ext','cinema-camp'];
const sourcePlacements=selected.flatMap(name=>manifest.placements.filter(p=>p.asset.endsWith('/'+name+'.glb'))),scenery=[],variants=[];
const {textureCompress,prune,dedup,weld}=require('@gltf-transform/functions'),sharp=require('sharp');
await mkdir(resolve(live,'minigames/scenery'),{recursive:true});
for(const p of sourcePlacements){const bytes=await readFile(resolve(live,p.asset)),model=await io.readBinary(bytes),triangles=d=>d.getRoot().listMeshes().reduce((n,m)=>n+m.listPrimitives().reduce((s,p)=>s+(p.getIndices()?.getCount()??p.getAttribute('POSITION')?.getCount()??0)/3,0),0),before=triangles(model);
 for(const node of model.getRoot().listNodes())if(/__lod_(?:med|low|vlow)__/.test(node.getName()))node.dispose();
 await model.transform(weld({tolerance:0}),dedup(),prune(),textureCompress({encoder:sharp,resize:[512,512],targetFormat:'webp',quality:88}));
 const asset='minigames/scenery/'+p.asset.split('/').at(-1),optimized=await io.writeBinary(model);await writeFile(resolve(live,asset),optimized);scenery.push({...p,asset,sourceAsset:p.asset});variants.push({source:p.asset,sourceSha256:createHash('sha256').update(bytes).digest('hex'),asset,sourceBytes:bytes.length,runtimeBytes:optimized.length,sourceTriangles:before,runtimeTriangles:triangles(model),changes:'highest drawable LOD only; original UVs preserved; exact vertex welding/deduplication; texture resolution capped512 WebP quality88; no triangle reduction'});
}
await writeFile(resolve(out,'scenery.json'),JSON.stringify(scenery,null,2));await writeFile(resolve(out,'scenery-provenance.json'),JSON.stringify({classification:'source-derived-gameplay-variant',variants},null,2));
await writeFile(resolve(out,'variants/circuit-sprint.json'),JSON.stringify({id:'circuit-sprint',gameId:'horse-race',rulesVersion:'valentine-horse-race-v2',status:'runtime-loaded',name:'Staub & Sekunden',mode:'time-trial',laps:1,rivals:0,halfWidth:4},null,2));
await writeFile(resolve(out,'variants/valentine-kart.json'),JSON.stringify({id:'valentine-kart',gameId:'horse-race',rulesVersion:'valentine-horse-race-v2',status:'runtime-loaded',name:'Hufeisen-Rallye · Valentine Kart',mode:'arcade',laps:3,rivals:3,halfWidth:4},null,2));
await writeFile(resolve(out,'variants/stable-menu.json'),JSON.stringify({id:'stable-menu',gameId:'horse-race',kind:'stable-menu',status:'runtime-loaded',rulesVersion:'valentine-horse-race-v2'},null,2));
const gamePath=resolve(out,'game.json'),game=JSON.parse(await readFile(gamePath));game.rulesVersion='valentine-horse-race-v2';game.variants=[{id:'stable-menu',file:'variants/stable-menu.json'},{id:'circuit-sprint',file:'variants/circuit-sprint.json'},{id:'valentine-kart',file:'variants/valentine-kart.json'}];game.notes='Local 3D mounted practice: source-street adapted circuit, countdown, steering, ordered gates, stamina, restart/pause. Arcade variant adds rivals, pickups and drift; no wallet or server authority.';await writeFile(gamePath,JSON.stringify(game,null,2));console.log(JSON.stringify({points:points.length,length:curve.getLength(),scenery:scenery.length}));
