/** Complete authored yards and street furniture, preserving source imports. */
import{readFile,writeFile,mkdir,realpath}from'node:fs/promises';import{resolve,dirname}from'node:path';import{fileURLToPath}from'node:url';import{createRequire}from'node:module';
import{loadGameplayHeight,loadNativeTerrainSurface}from'./prepare-authored-landscape.mjs';import{dressingPointAllowed}from'./prepare-authored-dressing.mjs';import{foliageSvg}from'./authored-foliage.mjs';
import{sourceGateAssemblies}from'./source-gate-assemblies.mjs';import{gateClearSpans}from'./gate-access.mjs';
import{sourcePropPlacement}from'./source-prop-placement.mjs';
import{safeFenceSpans,connectedFenceSpans}from'./fence-clearance-spans.mjs';
import{initDecorationMaterials,buildSteamTrain,buildStagecoach,buildFreightWagon,buildHitchedHorse,buildStreetDog,buildChicken,buildCemeteryStatue}from'./authored-world-decorations.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),live=resolve(root,'data/runtime/valentine/verified-scene'),require=createRequire(await realpath(resolve(root,'node_modules/@gltf-transform/cli/package.json'))),{Document,NodeIO}=require('@gltf-transform/core'),io=new NodeIO();
const{BoxGeometry,CylinderGeometry,PlaneGeometry,SphereGeometry,Shape,ExtrudeGeometry,Vector3,Quaternion,Euler,Matrix4}=createRequire(new URL('../apps/client/package.json',import.meta.url))('three');
const config=JSON.parse(await readFile(resolve(root,'data/reference/valentine/map-completion.json'))),dressing=JSON.parse(await readFile(resolve(root,'data/reference/valentine/environment-dressing.json'))),manifestFile=resolve(live,'rdo_world_manifest.json'),manifest=JSON.parse(await readFile(manifestFile)),polygon=JSON.parse(await readFile(resolve(root,'data/reference/valentine/playable-boundary.json'))).polygon,height=await loadGameplayHeight(io,manifest,live);
const sourceProps=JSON.parse(await readFile(resolve(root,'data/reference/valentine/source-prop-adaptations.json')));
if(config.yard.clearanceTails?.enabled){const p=config.yard.clearanceTails;if(p.classification!=='authored-gameplay'||!Number.isFinite(p.guardRadius)||p.guardRadius<.25||p.guardRadius>.5)throw new Error('Invalid fence clearance policy');}
for(const[id,override]of Object.entries(config.sourcePropPlacements??{})){const item=sourceProps.objects.find(p=>p.id===id);if(!item)throw new Error('Unknown source-prop override: '+id);sourcePropPlacement(item,override);}
const registry=JSON.parse(await readFile(resolve(root,'data/reference/valentine/buildings/registry.json'))),buildings=new Map();dressing.buildingKeepouts=[];
for(const ref of registry.buildings){const file=resolve(root,'data/reference/valentine/buildings',ref.file),b=JSON.parse(await readFile(file));for(const f of b.interior?.floorDefinitions??[]){const d=JSON.parse(await readFile(resolve(dirname(file),f.file)));if(d.layout){dressing.buildingKeepouts.push(d.layout);if(f.id==='ground')buildings.set(ref.id,d.layout);}}}
const doc=new Document(),buffer=doc.createBuffer(),scene=doc.createScene(),origin={x:-300,y:0,z:-780},groups=new Map(),physics={p:[],n:[]},placed=[],skipped=[],fenceProbes=[],fenceRecoveries=[];
const sourceIndex=process.argv.indexOf('--source-root'),sourceRoot=sourceIndex<0?root:resolve(process.argv[sourceIndex+1]);
const materials={};for(const[key,url]of Object.entries(config.textures)){const donor=dressing.textures[key]??dressing.textures.grass,bytes=await readFile(resolve(live,url)).catch(()=>readFile(resolve(sourceRoot,config.textureSources?.[key]??donor.source)));materials[key]=doc.createMaterial(key).setBaseColorTexture(doc.createTexture(key).setImage(bytes).setMimeType('image/png')).setBaseColorFactor(config.materialTints?.[key]??[1,1,1,1]).setRoughnessFactor(1).setMetallicFactor(0).setDoubleSided(true);}
materials.hay.setBaseColorFactor([1.1,1.05,.6,1]);materials.iron=doc.createMaterial('iron').setBaseColorFactor([.12,.13,.12,1]).setMetallicFactor(.6).setRoughnessFactor(.8);
const stoneImage=await require('sharp')(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><filter id="stone"><feTurbulence type="fractalNoise" baseFrequency=".11" numOctaves="4" seed="19"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="linear" slope=".38" intercept=".45"/><feFuncG type="linear" slope=".38" intercept=".45"/><feFuncB type="linear" slope=".36" intercept=".43"/></feComponentTransfer></filter><rect width="512" height="512" filter="url(#stone)"/></svg>')).png().toBuffer();
materials.stone.setBaseColorFactor([.63,.65,.60,1]).setBaseColorTexture(doc.createTexture('authored-weathered-limestone').setImage(stoneImage).setMimeType('image/png').setExtras({classification:'authored-gameplay',source:'procedural mineral grain'}));
materials.soil=doc.createMaterial('garden-earth').setBaseColorTexture(doc.createTexture('source-earth-albedo').setImage(await readFile(resolve(live,'textures/terrain/big_dirt_flat_01_abte.png'))).setMimeType('image/png')).setMetallicFactor(0).setRoughnessFactor(1);
materials.crop=doc.createMaterial('vegetable-leaves').setBaseColorTexture(materials.hay.getBaseColorTexture()).setBaseColorFactor([.52,.82,.36,1]).setMetallicFactor(0).setRoughnessFactor(.9).setDoubleSided(true);
materials.cloth=doc.createMaterial('weathered-cloth').setBaseColorTexture(doc.createTexture('source-canvas-albedo').setImage(await readFile(resolve(live,'interiors/cinema/canvas.png'))).setMimeType('image/png')).setMetallicFactor(0).setRoughnessFactor(1);
materials.glow=doc.createMaterial('lantern-glass').setBaseColorFactor([.9,.65,.25,1]).setEmissiveFactor([.45,.22,.04]).setMetallicFactor(0).setRoughnessFactor(.5);
materials.leaf=doc.createMaterial('authored-shrubs').setBaseColorTexture(doc.createTexture('own-leaf-branch').setImage(await require('sharp')(Buffer.from(foliageSvg())).png().toBuffer()).setMimeType('image/png')).setAlphaMode('MASK').setAlphaCutoff(.35).setDoubleSided(true).setRoughnessFactor(1).setMetallicFactor(0);
initDecorationMaterials(doc,materials,materials.wood);
function add(key,geometry,x,y,z,yaw=0,collision=false){const g=geometry.index?geometry.toNonIndexed():geometry;g.applyMatrix4(new Matrix4().compose(new Vector3(x-origin.x,y,z-origin.z),new Quaternion().setFromEuler(new Euler(0,yaw,0)),new Vector3(1,1,1)));
 const bucket=collision?physics:groups.get(`${key}@${Math.floor(x/32)}:${Math.floor(z/32)}`)??{p:[],n:[],uv:[]};for(const[k,a]of[['p','position'],['n','normal'],...(!collision?[['uv','uv']]:[])])bucket[k].push(...g.getAttribute(a).array);if(!collision)groups.set(`${key}@${Math.floor(x/32)}:${Math.floor(z/32)}`,bucket);if(g!==geometry)geometry.dispose();g.dispose();}
const box=(key,x,y,z,w,h,d,yaw=0,collision=false)=>{const g=new BoxGeometry(w,h,d);if(!collision){const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;for(let i=0;i<p.count;i++)uv.setXY(i,(Math.abs(n.getX(i))>.6?p.getZ(i):p.getX(i))/1.2,(Math.abs(n.getY(i))>.6?p.getZ(i):p.getY(i))/1.2);}add(key,g,x,y,z,yaw,collision);};
const cylinder=(key,x,y,z,r,h,yaw=0)=>add(key,new CylinderGeometry(r*.95,r,h,8),x,y,z,yaw);
function beam(a,b,r=.055,key='fenceWood'){const v=new Vector3(...b).sub(new Vector3(...a)),g=new CylinderGeometry(r,r,v.length(),6);g.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0,1,0),v.normalize()));add(key,g,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);}
const world=(c,x,z)=>({x:c.x+(x-c.x)*Math.cos(c.yaw)+(z-c.z)*Math.sin(c.yaw),z:c.z-(x-c.x)*Math.sin(c.yaw)+(z-c.z)*Math.cos(c.yaw)});
function pointAllowed(x,z,r=.1){return dressingPointAllowed(x,z,r,dressing,polygon);}
const sourceFenceDressing={...dressing,buildingKeepouts:dressing.buildingKeepouts.map(c=>({...c,width:Math.max(.1,c.width-2),depth:Math.max(.1,c.depth-2)}))};
const gateAssemblies=sourceGateAssemblies(sourceProps.objects),gateByComponent=new Map(gateAssemblies.flatMap(g=>g.componentIds.map(id=>[id,g]))),gateAccess=config.sourceGateAccess??{width:2.8,depth:4},gateCuts=[];
const gateOpenings=gateAssemblies.filter(g=>height(g.item.position.x,g.item.position.z)!==undefined&&sourceAllowed(g.item.position.x,g.item.position.z)).map(g=>({id:g.item.id,x:g.item.position.x,z:g.item.position.z,yaw:g.item.yaw,width:gateAccess.width,depth:gateAccess.depth}));
function fence(a,b,owner,style='rail',accessClipped=false,clearanceClipped=false){
 if(!accessClipped){const spans=gateClearSpans(a,b,gateOpenings),length=Math.hypot(b.x-a.x,b.z-a.z),remaining=spans.reduce((n,s)=>n+Math.hypot(s.b.x-s.a.x,s.b.z-s.a.z),0);if(length-remaining>1e-5){gateCuts.push({owner,from:a,to:b,removedMetres:length-remaining});for(const span of spans)fence(span.a,span.b,owner,style,true);return;}}
 const wood=style==='picket'?'fenceWood':'fenceCorral';
 const allowed=owner.startsWith('source-prop:')?(x,z,r)=>dressingPointAllowed(x,z,r,sourceFenceDressing,polygon):pointAllowed;
 const distance=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.ceil(distance/config.yard.panelLength),dx=(b.x-a.x)/steps,dz=(b.z-a.z)/steps;
 for(let i=0;i<steps;i++){const x=a.x+dx*i,z=a.z+dz*i,bx=x+dx,bz=z+dz,cx=(x+bx)/2,cz=(z+bz)/2,ay=height(x,z),by=height(bx,bz);if(ay===undefined||by===undefined||Math.abs(ay-by)>1.8||!allowed(cx,cz,.2)||!allowed(x,z,.12)||!allowed(bx,bz,.12)){const probes=[[cx,cz,.2],[x,z,.12],[bx,bz,.12]].map(([px,pz,radius])=>({x:px,z:pz,radius,allowed:allowed(px,pz,radius),corridorAllowed:dressingPointAllowed(px,pz,radius,{...dressing,buildingKeepouts:[]},polygon)}));skipped.push({kind:'fence-panel',owner,x:cx,z:cz,from:{x,y:ay,z},to:{x:bx,y:by,z:bz},style,missingHeight:ay===undefined||by===undefined,heightDelta:ay===undefined||by===undefined?null:Math.abs(ay-by),probes});continue;}
  const h=style==='picket'?1.1:style==='corral'?1.45:config.yard.height,yaw=Math.atan2(dx,dz);box(wood,x,ay+h/2,z,.17,h,.17);box(wood,bx,by+h/2,bz,.17,h,.17);
  if(style==='corral')for(const offset of[.4,.85,1.3]){const length=Math.hypot(dx,dz),g=new BoxGeometry(.10,.15,Math.hypot(length,by-ay));g.rotateX(-Math.atan2(by-ay,length));add(wood,g,cx,(ay+by)/2+offset,cz,yaw);}
  else for(const offset of[.4,h-.18])beam([x,ay+offset,z],[bx,by+offset,bz],.065,wood);
  if(style==='picket')for(let j=1;j<7;j++){const t=j/7;box('fenceWood',x+dx*t,ay+(by-ay)*t+h/2,z+dz*t,.075,h-.08,.055);}
  box(wood,cx,(ay+by)/2+h/2,cz,.16,h,Math.hypot(dx,dz),yaw,true);fenceProbes.push({owner,x:cx,z:cz,y:(ay+by)/2,dx,dz,height:h});placed.push({kind:'fence-panel',owner,x:cx,z:cz,...(clearanceClipped?{clearanceAdaptation:'safe-tail-of-guarded-source-span'}:{})});
 }
}
for(const id of config.yardBuildings){const c=buildings.get(id);if(!c)continue;const pad=config.yard.padding,x0=c.x-c.width/2-pad,x1=c.x+c.width/2+pad,front=c.z+c.frontDirection*(c.depth/2+pad+1),back=c.z-c.frontDirection*(c.depth/2+pad),gate=Math.max(config.yard.gateWidth,c.doorWidth+1)/2,style=/res-|church|sheriff/.test(id)?'picket':'rail';
 for(const[a,b]of[[[x0,front],[c.doorX-gate,front]],[[c.doorX+gate,front],[x1,front]],[[x0,front],[x0,back]],[[x0,back],[x1,back]],[[x1,back],[x1,front]]])fence(world(c,...a),world(c,...b),id,style);
 if(config.yard.portalOwners?.includes(id)){const a=world(c,c.doorX-gate,front),b=world(c,c.doorX+gate,front),ay=height(a.x,a.z),by=height(b.x,b.z);if(ay!==undefined&&by!==undefined){for(const[p,y]of[[a,ay],[b,by]])box('wood',p.x,y+1.6,p.z,.22,3.2,.22);beam([a.x,ay+3.15,a.z],[b.x,by+3.15,b.z],.14);placed.push({kind:'yard-portal',owner:id,x:(a.x+b.x)/2,y:(ay+by)/2,z:(a.z+b.z)/2});}}
}
function sourceAllowed(x,z){for(const c of buildings.values()){const co=Math.cos(c.yaw??0),si=Math.sin(c.yaw??0),dx=x-c.x,dz=z-c.z,lx=dx*co-dz*si,lz=dx*si+dz*co;if(Math.abs(lx)<c.width/2+.1&&Math.abs(lz)<c.depth/2+.1)return false;const along=(lz-(c.front-c.z))*c.frontDirection;if(Math.abs(lx-(c.doorX-c.x))<c.doorWidth/2+.45&&along>=-.2&&along<Math.abs(c.rampStart-c.front)+1)return false;}return true;}
function prop(kind,x,z,yaw,owner,source=false,sourceY){let y=height(x,z);if(y===undefined||!(source?sourceAllowed(x,z):pointAllowed(x,z,kind==='cargo'?1.1:.7))){skipped.push({kind,owner,x,z,reason:source?'inside own room or entrance access':'placement clearance'});return false;}
 if(kind==='lantern'&&Number.isFinite(sourceY)){if(sourceY-y>8){skipped.push({kind,owner,x,z,reason:'elevated source fixture without supported presentation'});return false;}y=Math.max(y,sourceY-.18);}
 if(source)for(const c of buildings.values())if(c.porch){const co=Math.cos(c.yaw??0),si=Math.sin(c.yaw??0),lx=c.x+(x-c.x)*co-(z-c.z)*si,lz=c.z+(x-c.x)*si+(z-c.z)*co;if(Math.abs(lx-c.porch.x)<=c.porch.width/2&&Math.abs(lz-c.porch.z)<=c.porch.depth/2)y=c.floorY;}
 const propBox=(...args)=>{if(source&&kind!=='gravestone'&&args.at(-1)===true)return;box(...args);};
 const local=(dx,dz)=>({x:x+dx*Math.cos(yaw)+dz*Math.sin(yaw),z:z-dx*Math.sin(yaw)+dz*Math.cos(yaw)}),part=(dx,dy,dz,w,h,d,key='wood')=>{const p=local(dx,dz);propBox(key,p.x,y+dy,p.z,w,h,d,yaw);};
 if(kind==='bench'){part(0,.52,0,2,.12,.65);part(0,.95,-.27,2,.6,.1);for(const dx of[-.75,.75]){part(dx,.25,0,.12,.5,.5);part(dx,.75,-.27,.1,1,.1);}propBox('wood',x,y+.55,z,2,1.1,.65,yaw,true);}
 else if(kind==='barrel'){cylinder('barrel',x,y+.45,z,.34,.9);for(const h of[.17,.7])cylinder('iron',x,y+h,z,.35,.04);propBox('wood',x,y+.45,z,.7,.9,.7,yaw,true);}
 else if(kind==='cargo'){for(const[dx,dy,dz,w,h,d]of[[-.5,.45,0,.8,.9,.9],[.5,.35,.2,.9,.7,.8],[-.45,1.1,0,.6,.4,.6]]){part(dx,dy,dz,w,h,d);part(dx,dy,dz,w+.03,.08,d+.03);}propBox('wood',x,y+.65,z,1.9,1.3,1.2,yaw,true);}
 else if(kind==='hitch'){for(const dx of[-1.3,1.3])part(dx,.62,0,.15,1.24,.15);part(0,1.1,0,2.85,.15,.15);propBox('wood',x,y+.62,z,2.85,1.24,.16,yaw,true);}
 else if(kind==='trough'){part(0,.2,0,2,.15,.8);part(0,.48,.39,2,.5,.1);part(0,.48,-.39,2,.5,.1);part(-.95,.48,0,.1,.5,.8);part(.95,.48,0,.1,.5,.8);part(0,.42,0,1.8,.02,.6,'iron');propBox('wood',x,y+.37,z,2,.75,.8,yaw,true);}
 else if(kind==='woodpile'){for(let row=0;row<3;row++)for(let col=0;col<4-row;col++){const p=local((col-(3-row)/2)*.26,0),g=new CylinderGeometry(.12,.14,1.1,7);g.rotateX(Math.PI/2);add('wood',g,p.x,y+.15+row*.22,p.z,yaw);}propBox('wood',x,y+.4,z,1.2,.8,1.2,yaw,true);}
 else if(kind==='hay'){for(const[dx,dz,h]of[[-.45,0,.6],[.45,.1,.6],[0,0,1.1]]){part(dx,h/2,dz,.8,h,.8,'hay');for(const offset of[-.2,.2])part(dx+offset,h/2+.015,dz,.035,h+.02,.81,'wood');}propBox('wood',x,y+.55,z,1.7,1.1,1,yaw,true);}
 else if(kind==='planter'){part(0,.25,0,1.4,.5,.7);for(let i=0;i<12;i++)add('leaf',new PlaneGeometry(.6,.7),x+(i%4-1.5)*.25,y+.7+(i%3)*.08,z+((i*7)%5-2)*.07,i*2.399);}
 else if(kind==='feedbags'){for(let i=0;i<3;i++){const p=local((i-1)*.5,i%2*.2),g=new SphereGeometry(.38,8,6);g.scale(.85,1.25,.65);add('cloth',g,p.x,y+.4+(i===1?.1:0),p.z,yaw);}}
 else if(kind==='chair'){part(0,.49,0,.56,.09,.56);for(const dx of[-.23,.23])for(const dz of[-.23,.23])part(dx,.25,dz,.065,.5,.065);for(const dx of[-.23,.23])part(dx,.87,-.23,.065,.72,.065);for(const h of[.75,.95,1.12])part(0,h,-.23,.52,.10,.065);}
 else if(kind==='table'){part(0,.79,0,1.5,.10,.95);for(const dx of[-.6,.6])for(const dz of[-.35,.35])part(dx,.39,dz,.10,.78,.10);part(0,.18,0,1.3,.08,.08);}
 else if(kind==='stump'){cylinder('wood',x,y+.3,z,.44,.6);cylinder('hay',x,y+.605,z,.43,.025);for(const a of[0,2,4]){const p=local(Math.cos(a)*.38,Math.sin(a)*.38);part(p.x-x,.1,p.z-z,.18,.20,.18);}}
 else if(kind==='milk-can'){cylinder('iron',x,y+.38,z,.25,.75);cylinder('iron',x,y+.78,z,.18,.12);part(0,.88,0,.22,.06,.07,'iron');}
 else if(kind==='bucket'){cylinder('wood',x,y+.22,z,.27,.44);cylinder('iron',x,y+.445,z,.26,.025);for(const h of[.09,.35])cylinder('iron',x,y+h,z,.28,.025);part(0,.62,0,.55,.04,.04,'iron');}
 else if(kind==='lantern'){part(0,.20,0,.19,.30,.19,'glow');for(const dx of[-.115,.115])for(const dz of[-.115,.115])part(dx,.20,dz,.025,.36,.025,'iron');part(0,.02,0,.29,.04,.29,'iron');part(0,.40,0,.32,.07,.32,'iron');part(0,.49,0,.04,.16,.04,'iron');}
 else if(kind==='campfire'){for(let i=0;i<10;i++){const angle=i*Math.PI/5;const p=local(Math.cos(angle)*.55,Math.sin(angle)*.55),g=new SphereGeometry(.15,6,4);g.scale(1,.7,.8);add('stone',g,p.x,y+.06,p.z);}for(const i of[-1,1])part(0,.09,i*.13,.85,.12,.13);cylinder('iron',x,y+.025,z,.42,.04);}
 else if(kind==='grave-mound'){const g=new SphereGeometry(1,10,5);g.scale(.6,.16,1.2);add('soil',g,x,y+.025,z,yaw);}
 else if(kind==='gravestone'){
  const variant=Math.abs(Math.round(x*17+z*7))%5,h=.85+variant*.12,w=.55+variant*.025;part(0,.07,0,w+.18,.14,.46,'stone');
  if(variant===0){part(0,h*.6,0,.17,h,.19,'stone');part(0,h*.8,0,.62,.16,.20,'stone');}
  else {const shape=new Shape();shape.moveTo(-w/2,0);shape.lineTo(w/2,0);shape.lineTo(w/2,h-w/2);shape.absarc(0,h-w/2,w/2,0,Math.PI,false);shape.closePath();const g=new ExtrudeGeometry(shape,{depth:.16,bevelEnabled:true,bevelThickness:.025,bevelSize:.02,bevelSegments:1,steps:1,curveSegments:8});add('stone',g,x,y+.14,z-.08,yaw);}
  propBox('wood',x,y+.45,z,.7,.9,.55,yaw,true);
 }
 placed.push({kind,owner,x,y,z});return true;
}
for(const[id,kinds]of Object.entries(config.frontages)){const c=buildings.get(id);if(!c)continue;for(const[i,kind]of kinds.entries()){let done=false;const sign=i%2?-1:1;for(const extra of[0,2,5,8]){const px=c.doorX+sign*(3.5+Math.floor(i/2)*3+extra),pz=c.rampStart+c.frontDirection*(2+extra*.4),p=world(c,px,pz);if(prop(kind,p.x,p.z,c.yaw,id)){done=true;break;}}if(!done){for(const[dx,dz]of[[c.width/2+3,-c.depth/2+2],[-c.width/2-3,-c.depth/2+2],[c.width/2+3,c.depth/2-2],[-c.width/2-3,c.depth/2-2],[-3,-c.frontDirection*(c.depth/2+4)],[3,-c.frontDirection*(c.depth/2+4)]]){const p=world(c,c.x+dx,c.z+dz);if(prop(kind,p.x,p.z,c.yaw,id)){done=true;break;}}}if(!done)skipped.push({kind,owner:id,reason:'no safe frontage or side/back-yard location'});}}
const church=buildings.get('church'),cemetery=config.cemetery;
if(church&&cemetery){const cx=church.x+cemetery.offset[0],cz=church.z+cemetery.offset[1],w=cemetery.width/2,d=cemetery.depth/2;
 for(let row=0;row<cemetery.rows;row++)for(let col=0;col<cemetery.columns;col++){if(row===2&&col===2)continue;const px=cx-w+1.8+row*(cemetery.width-3.6)/(cemetery.rows-1)+Math.sin(row*3+col)*.25,pz=cz-d+1.8+col*(cemetery.depth-3.6)/(cemetery.columns-1)+Math.sin(col*2+row)*.25,p=world(church,px,pz);prop('gravestone',p.x,p.z,church.yaw+(col%3-1)*.05,'church-cemetery');}
 for(const[a,b]of[[[cx-w,cz-d],[cx+w,cz-d]],[[cx+w,cz-d],[cx+w,cz+d]],[[cx+w,cz+d],[cx+2.3,cz+d]],[[cx-2.3,cz+d],[cx-w,cz+d]],[[cx-w,cz+d],[cx-w,cz-d]]])fence(world(church,...a),world(church,...b),'church-cemetery','picket');
}
for(const network of config.fenceNetworks??[]){const c={x:network.center[0],z:network.center[1],yaw:network.yaw??0};for(const path of network.paths)for(let i=1;i<path.length;i++)fence(world(c,c.x+path[i-1][0],c.z+path[i-1][1]),world(c,c.x+path[i][0],c.z+path[i][1]),network.id,network.style);}
for(const item of config.districtProps??[])prop(item.kind,...item.position,item.yaw??0,item.owner);
if(config.decorativeWorldObjects){
 const decCtx={add,box,cylinder,beam,height,materials},dwo=config.decorativeWorldObjects;
 if(dwo.steamTrain){
  const ok=buildSteamTrain(decCtx,{x:dwo.steamTrain.position.x,z:dwo.steamTrain.position.z,yaw:dwo.steamTrain.yaw});
  if(ok)placed.push({kind:'steam-train',owner:dwo.steamTrain.id,...dwo.steamTrain.position});
 }
  if(dwo.cemeteryStatue){
   const ok=buildCemeteryStatue(decCtx,{x:dwo.cemeteryStatue.position.x,z:dwo.cemeteryStatue.position.z,yaw:dwo.cemeteryStatue.yaw,scale:dwo.cemeteryStatue.scale?.[0]??1.9});
   if(ok)placed.push({kind:'cemetery-statue',owner:dwo.cemeteryStatue.id,...dwo.cemeteryStatue.position});
  }
 for(const c of dwo.carriages??[]){
  let ok=false;
  if(c.kind==='stagecoach')ok=buildStagecoach(decCtx,{x:c.position.x,z:c.position.z,yaw:c.yaw});
  else if(c.kind==='freight-wagon')ok=buildFreightWagon(decCtx,{x:c.position.x,z:c.position.z,yaw:c.yaw,covered:c.covered===true});
  if(ok)placed.push({kind:c.kind,owner:c.id,...c.position});
 }
 if(dwo.animals){
  for(const h of dwo.animals.hitchedHorses??[]){
   const ok=buildHitchedHorse(decCtx,{x:h.position.x,z:h.position.z,yaw:h.yaw,coat:h.coat});
   if(ok)placed.push({kind:'hitched-horse',owner:h.id,...h.position});
  }
  for(const d of dwo.animals.streetDogs??[]){
   const ok=buildStreetDog(decCtx,{x:d.position.x,z:d.position.z,yaw:d.yaw,pose:d.pose});
   if(ok)placed.push({kind:'street-dog',owner:d.id,...d.position});
  }
  for(const ch of dwo.animals.chickens??[]){
   const ok=buildChicken(decCtx,{x:ch.position.x,z:ch.position.z,yaw:ch.yaw,perchedY:ch.perchedY});
   if(ok)placed.push({kind:'chicken',owner:ch.id,...ch.position});
  }
 }
}
for(const item of sourceProps.objects){const {x,z}=item.position,owner=item.id;
 if(item.kind==='fence'){
  const representation=item.representation,yaw=item.yaw+(representation.axis==='z'?Math.PI/2:0),half=representation.width*item.scaleXY/2,dx=Math.cos(yaw)*half,dz=-Math.sin(yaw)*half;
  fence({x:x-dx,z:z-dz},{x:x+dx,z:z+dz},owner,/fence0[46]|fencez/.test(item.model)?'picket':'corral');
 }else if(item.kind==='fence-post'){
  const y=height(x,z);if(y!==undefined&&pointAllowed(x,z,.1)){box(item.model.includes('wall')?'stone':'fenceCorral',x,y+.7,z,.16,1.4,.16,item.yaw);placed.push({kind:'source-fence-post',owner,x,y,z});}
 }else if(item.kind==='fence-gate'){
  const assembly=gateByComponent.get(item.id);if(assembly?.item.id!==item.id)continue;
  const y=height(x,z);if(y===undefined||!sourceAllowed(x,z))continue;
  // Gate leaf swung aside: retain the original gate anchor, keep the crossing open.
  const dx=Math.cos(item.yaw),dz=-Math.sin(item.yaw),half=gateAccess.width/2;for(const side of[-1,1])box('fenceCorral',x+dx*side*half,y+.75,z+dz*side*half,.18,1.5,.18);
  for(const h of[.4,.9,1.3])box('fenceCorral',x-dx*half+dz,y+h,z-dz*half-dx,.12,.14,2,item.yaw+Math.PI/2);placed.push({kind:'source-open-gate',owner,componentIds:assembly.componentIds,x,y,z});
 }else{const override=config.sourcePropPlacements?.[item.id],p=sourcePropPlacement(item,override);if(override&&!pointAllowed(p.x,p.z,override.clearanceRadius))throw new Error('Authored prop access clearance changed: '+item.id);const added=prop(item.kind,p.x,p.z,item.yaw,owner,true,item.position.y);if(override){if(!added)throw new Error('Authored source-prop placement rejected: '+item.id);placed.at(-1).adaptation=p.adaptation;}}
}
for(const area of config.gardens??[]){const c={x:area.center[0],z:area.center[1],yaw:area.yaw??0},w=area.width/2,d=area.depth/2;
 for(let row=0;row<area.rows;row++){const lx=-w+1+row*(area.width-2)/(area.rows-1);
  for(let k=0;k<Math.floor(area.depth-2);k++){const p=world(c,c.x+lx,c.z-d+1+k),y=height(p.x,p.z);if(y===undefined||!pointAllowed(p.x,p.z,.15))continue;box('soil',p.x,y+.045,p.z,.6,.09,1,c.yaw);
   const head=new SphereGeometry(.22+(row%3)*.025,7,5);head.scale(1,.65,1);add('crop',head,p.x,y+.20,p.z,c.yaw);
   for(let leaf=0;leaf<4;leaf++){const angle=leaf*Math.PI/2+row*.5,g=new SphereGeometry(.23,6,4);g.scale(1,.25,.58);g.rotateX((leaf%2?1:-1)*.45);add('crop',g,p.x+Math.sin(angle)*.20,y+.17,p.z+Math.cos(angle)*.20,angle);}
   placed.push({kind:'vegetable',owner:area.id,x:p.x,y,z:p.z});
  }
 }
 for(const[a,b]of[[[-w,-d],[w,-d]],[[w,-d],[w,d]],[[w,d],[2,d]],[[-2,d],[-w,d]],[[-w,d],[-w,-d]]])fence(world(c,c.x+a[0],c.z+a[1]),world(c,c.x+b[0],c.z+b[1]),area.id,'picket');
 const side=world(c,c.x+w+1.2,c.z-d+2);prop('barrel',side.x,side.z,c.yaw,area.id);
}
if(config.yard.clearanceTails?.enabled){const policy=config.yard.clearanceTails,anchors=[...fenceProbes.flatMap(f=>[-1,1].map(sign=>({x:f.x+sign*f.dx/2,z:f.z+sign*f.dz/2}))),...placed.filter(p=>p.kind==='source-fence-post')];
 for(const rejected of [...skipped].filter(p=>p.kind==='fence-panel'&&!p.missingHeight&&p.heightDelta<=1.8)){const guard=rejected.owner.startsWith('source-prop:')?sourceFenceDressing:dressing,allowed=(x,z)=>dressingPointAllowed(x,z,policy.guardRadius,guard,polygon),spans=connectedFenceSpans(safeFenceSpans(rejected.from,rejected.to,allowed,policy),anchors,policy.connectionTolerance??.2);if(!spans.length)continue;
 fenceRecoveries.push({owner:rejected.owner,style:rejected.style,from:rejected.from,to:rejected.to,spans,classification:'authored-gameplay',connectedToExistingFence:true,reason:'Conservative connected tail of omitted panel; protected roads/rooms/stairs and gate spans retained'});skipped.splice(skipped.indexOf(rejected),1);for(const span of spans)fence(span.a,span.b,rejected.owner,rejected.style,true,true);
 }
}
if(process.argv.includes('--audit-only')){const out=resolve(root,'data/runtime/valentine/access-2026-10-29/fence-clearance');await mkdir(out,{recursive:true});await writeFile(resolve(out,'audit.json'),JSON.stringify({at:new Date().toISOString(),skipped,fenceProbes,fenceRecoveries,gateOpenings,gateCuts},null,2));console.log(JSON.stringify({auditOnly:true,skipped:skipped.length,fences:fenceProbes.length}));process.exit(0);}
for(const[key,g]of groups){const base=materials[key.split('@')[0]],m=doc.createMaterial(key).setBaseColorTexture(base.getBaseColorTexture()).setBaseColorFactor(base.getBaseColorFactor()).setRoughnessFactor(base.getRoughnessFactor()).setMetallicFactor(base.getMetallicFactor()).setDoubleSided(true).setAlphaMode(base.getAlphaMode()).setAlphaCutoff(base.getAlphaCutoff()),p=doc.createPrimitive().setMaterial(m);for(const[name,type,a]of[['POSITION','VEC3',g.p],['NORMAL','VEC3',g.n],['TEXCOORD_0','VEC2',g.uv]])p.setAttribute(name,doc.createAccessor().setType(type).setArray(new Float32Array(a)).setBuffer(buffer));scene.addChild(doc.createNode(key).setMesh(doc.createMesh().addPrimitive(p)));}
doc.getRoot().setExtras({classification:'authored-gameplay',config:'data/reference/valentine/map-completion.json',originalModelClaim:false});await doc.transform(require('@gltf-transform/functions').prune());const asset='models/authored/valentine-completion.glb';await mkdir(dirname(resolve(live,asset)),{recursive:true});await io.write(resolve(live,asset),doc);
const cd=new Document(),cb=cd.createBuffer(),cs=cd.createScene(),p=cd.createPrimitive().setMaterial(cd.createMaterial('single-collision-owner').setDoubleSided(true));for(const[name,a]of[['POSITION',physics.p],['NORMAL',physics.n]])p.setAttribute(name,cd.createAccessor().setType('VEC3').setArray(new Float32Array(a)).setBuffer(cb));cs.addChild(cd.createNode('yards-and-props-collision').setMesh(cd.createMesh().addPrimitive(p)));const collisionAsset='models/authored/valentine-completion-collision.glb';await io.write(resolve(live,collisionAsset),cd);
const placement=(id,asset,tags)=>({id,asset,position:origin,rotation:{x:0,y:0,z:0},scale:{x:1,y:1,z:1},layer:'buildings',chunkId:'-2:-4',lod:0,tags:['authored-gameplay','role:dressing',...tags]}),visual=placement('authored:valentine-completion',asset,['collision:none']),collision=placement('authored:valentine-completion-collision',collisionAsset,['render:physics-only','occlusion:none']);await writeFile(manifestFile,JSON.stringify({...manifest,placements:[...manifest.placements.filter(p=>![visual.id,collision.id].includes(p.id)&&!(config.replaceLiveryYardFencesWithSource&&['models/authored/livery-yard-fences.glb','models/authored/livery-yard-collision.glb'].includes(p.asset))),visual,collision]},null,2));
const report={at:new Date().toISOString(),classification:'authored-gameplay',counts:Object.fromEntries([...new Set(placed.map(p=>p.kind))].map(k=>[k,placed.filter(p=>p.kind===k).length])),visualTriangles:[...groups.values()].reduce((n,g)=>n+g.p.length/9,0),collisionTriangles:physics.p.length/9,placed,skipped,fenceProbes,fenceRecoveries,gateCuts,gateOpenings,gateAssemblies:gateAssemblies.map(g=>({owner:g.item.id,componentIds:g.componentIds,sourceModels:g.components.map(c=>c.model)}))};await writeFile(resolve(live,'map-completion-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({counts:report.counts,visualTriangles:report.visualTriangles,collisionTriangles:report.collisionTriangles,skipped:skipped.length}));
