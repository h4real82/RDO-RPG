import {ACESFilmicToneMapping,AnimationMixer,Box3,BoxGeometry,BufferGeometry,CanvasTexture,Color,CylinderGeometry,DirectionalLight,FogExp2,Float32BufferAttribute,Group,HemisphereLight,InstancedMesh,Matrix4,Mesh,MeshStandardMaterial,PerspectiveCamera,Points,PointsMaterial,Raycaster,Scene,SRGBColorSpace,Texture,TextureLoader,TorusGeometry,Vector3,WebGLRenderer,type Object3D} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {clone} from 'three/examples/jsm/utils/SkeletonUtils.js';
import {sceneAssetUrl} from '../../world/SceneSource';
import {prepareSourceAppearance} from '../../world/SourceAppearance';
import {selectHighestDrawableLod} from '../../world/DrawableLod';
import scenery from '../../../../../../data/reference/minigames/horse-race/scenery.json';
import type{RaceSimulation}from'./RaceSimulation';
import{prepareDrawableMaterialPreview}from'../../world/DrawableMaterialPreview';
import{poseMountedRider}from'./MountedPose';
import{tintRivalHorse}from'./RivalAppearance';
import{OcclusionController}from'../../player/OcclusionController';
import{prepareSourceRaycasts}from'../../world/SourceRaycasts';

/** Render adapter. Simulation, standings and checkpoints never depend on meshes. */
export class RaceView{
 readonly canvas:HTMLCanvasElement;readonly scene=new Scene();
 private renderer:WebGLRenderer;private camera=new PerspectiveCamera(57,1,.1,400);private observer:ResizeObserver;
 private disposed=false;private models:Group[]=[];private mixers:AnimationMixer[]=[];private actors:Group[]=[];private gates=new Group();private pickupMeshes:Mesh[]=[];private oilMeshes:Mesh[]=[];
 private dustArray=new Float32Array(150*3);private dustGeometry=new BufferGeometry();private dustCursor=0;private dustClock=0;private dust:Points;
 private target=new Vector3();private desired=new Vector3();private look=new Vector3();private initialized=false;
 private banner=document.createElement('canvas');private bannerTexture:CanvasTexture;private bannerGate=-1;
 private occluders:Group[]=[];private occlusion=new OcclusionController(this.occluders);private occlusionRay=new Raycaster();private playerTarget=new Vector3();
 constructor(private parent:HTMLElement,private sim:RaceSimulation,private reducedMotion:boolean){
  this.renderer=new WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));this.renderer.toneMapping=ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;this.canvas=this.renderer.domElement;this.canvas.setAttribute('aria-label','Dreidimensionale Valentine-Rennstrecke');parent.append(this.canvas);
  this.scene.background=new Color('#b7c5c3');this.scene.fog=new FogExp2('#b7c5c3',.007);this.scene.add(new HemisphereLight('#f5ecdc','#6b6446',2.4));const sun=new DirectionalLight('#ffebc9',2.8);sun.position.set(-100,250,100);this.scene.add(sun);
  this.dustArray.fill(-1000);this.dustGeometry.setAttribute('position',new Float32BufferAttribute(this.dustArray,3));this.dust=new Points(this.dustGeometry,new PointsMaterial({color:'#c5ab80',size:.22,transparent:true,opacity:.3,depthWrite:false}));this.dust.frustumCulled=false;this.scene.add(this.dust,this.gates);
  const wood=new MeshStandardMaterial({color:'#6e5031',roughness:1}),banner=new MeshStandardMaterial({color:'#b49d64',roughness:1});
  for(const side of [-1,1]){const post=new Mesh(new CylinderGeometry(.09,.13,4.2,6),wood);post.position.set(side*(sim.variant.halfWidth+.4),2.1,0);this.gates.add(post);}const lintel=new Mesh(new BoxGeometry(sim.variant.halfWidth*2+.8,.45,.08),banner);lintel.position.y=4;this.gates.add(lintel);
  this.banner.width=512;this.banner.height=64;this.bannerTexture=new CanvasTexture(this.banner);this.bannerTexture.colorSpace=SRGBColorSpace;
  const sign=new Mesh(new BoxGeometry(5,.55,.09),new MeshStandardMaterial({map:this.bannerTexture,roughness:1}));sign.position.set(0,4,.06);this.gates.add(sign);
  const postCount=Math.floor(sim.course.length/10),posts=new InstancedMesh(new CylinderGeometry(.055,.08,1.15,5),wood,postCount*2),matrix=new Matrix4();
  for(let i=0;i<postCount;i++){const p=sim.course.at(i*sim.course.length/postCount);for(const[si,side]of[-1,1].entries()){const offset=side*(sim.variant.halfWidth+1.4);matrix.makeTranslation(p.x+Math.cos(p.heading)*offset,p.y+.5,p.z-Math.sin(p.heading)*offset);posts.setMatrixAt(i*2+si,matrix);}}this.scene.add(posts);
  const line=new Group(),first=sim.course.at(0);for(let i=0;i<16;i++){const square=new Mesh(new BoxGeometry(.5,.025,.55),new MeshStandardMaterial({color:i%2?'#e6dcc4':'#2a2c25',roughness:1}));square.position.set((i-7.5)*.5,.09,0);line.add(square);}line.position.set(first.x,first.y,first.z);line.rotation.y=first.heading;this.scene.add(line);
  for(const p of sim.pickups){const mesh=new Mesh(new TorusGeometry(.42,.105,6,12,Math.PI*1.65),new MeshStandardMaterial({color:'#b98b35',metalness:.8,roughness:.35}));const q=sim.course.at(p.s);mesh.position.set(q.x+Math.cos(q.heading)*p.lane,q.y+1.15,q.z-Math.sin(q.heading)*p.lane);this.pickupMeshes.push(mesh);this.scene.add(mesh);}
  for(let i=0;i<12;i++){const m=new Mesh(new CylinderGeometry(1.1,1.1,.02,16),new MeshStandardMaterial({color:'#1b1916',roughness:.18,transparent:true,opacity:.8}));m.visible=false;this.oilMeshes.push(m);this.scene.add(m);}
  this.observer=new ResizeObserver(()=>{try{if(!this.disposed&&this.parent?.isConnected)this.resize();}catch(error){console.error('Race resize failed.',error);}});this.observer.observe(parent);this.resize();
 }
 private resize(){const w=Math.max(1,this.parent.clientWidth),h=Math.max(1,this.parent.clientHeight);this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
 private disposeObject(root:Object3D){const geometries=new Set<BufferGeometry>(),materials=new Set<MeshStandardMaterial>(),textures=new Set<Texture>();root.traverse(o=>{if(o instanceof Mesh||o instanceof Points){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m as MeshStandardMaterial);for(const v of Object.values(m))if(v instanceof Texture)textures.add(v);}}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}
 async load(onStatus:(message:string)=>void){
  const loader=new GLTFLoader();onStatus('Pferde satteln …');
  const results=await Promise.allSettled([loader.loadAsync('/runtime/player-models/horses/horse-01/model.glb'),loader.loadAsync('/runtime/player-models/characters/cowboy-01/model.glb'),loader.loadAsync(sceneAssetUrl('minigames/race-course.glb'))]);
  if(this.disposed){for(const r of results)if(r.status==='fulfilled')this.disposeObject(r.value.scene);return;}
  if(results.some(r=>r.status==='rejected')){for(const r of results)if(r.status==='fulfilled')this.disposeObject(r.value.scene);throw new Error('Pferd, Reiter oder Rennstrecke konnte nicht geladen werden. Erneut öffnen.');}
  const [horse,rider,ground]=results.map(r=>(r as PromiseFulfilledResult<Awaited<ReturnType<typeof loader.loadAsync>>>).value);
  this.scene.add(ground.scene);this.models.push(ground.scene);
  // Normalize preserved source models; seated skeleton pose is authored.
  const normalize=(object:Group,height:number)=>{const b=new Box3().setFromObject(object),scale=height/(b.max.y-b.min.y),center=b.getCenter(new Vector3());object.position.sub(new Vector3(center.x,b.min.y,center.z));const wrapper=new Group();wrapper.add(object);wrapper.scale.setScalar(scale);return wrapper;};
  const horseTemplate=normalize(horse.scene,2.05),riderTemplate=normalize(rider.scene,1.75);
  horseTemplate.rotation.y=-Math.PI/2;poseMountedRider(riderTemplate);
  for(let i=0;i<this.sim.riders.length;i++){
   const actor=new Group(),h=clone(horseTemplate) as Group,r=clone(riderTemplate) as Group;r.position.set(0,.55,0);actor.add(h,r);this.scene.add(actor);this.actors.push(actor);
   const mixer=new AnimationMixer(h);if(horse.animations[0])mixer.clipAction(horse.animations[0]).play();this.mixers.push(mixer);
   if(i)tintRivalHorse(h,new Color(i===1?'#b0a497':i===2?'#aab0b5':'#b5a286'));
  }
  this.models.push(horseTemplate,riderTemplate);onStatus('Strecke bereit');
  // Source landmarks arrive in the background; a closed overlay releases late loads.
  await(async()=>{for(const [index,p] of scenery.entries()){if(this.disposed)break;onStatus(`Valentine aufbauen · ${index+1}/${scenery.length}`);try{const gltf=await loader.loadAsync(sceneAssetUrl(p.asset));if(this.disposed){this.disposeObject(gltf.scene);break;}
    prepareDrawableMaterialPreview(gltf.scene);await prepareSourceAppearance(gltf.scene,{asset:p.sourceAsset??p.asset,loadTexture:url=>new TextureLoader().loadAsync(url)});if(this.disposed){this.disposeObject(gltf.scene);break;}selectHighestDrawableLod(gltf.scene);gltf.scene.position.set(p.position.x,p.position.y,p.position.z);gltf.scene.rotation.set(p.rotation.x,p.rotation.y,p.rotation.z);gltf.scene.scale.set(p.scale.x,p.scale.y,p.scale.z);this.models.push(gltf.scene);this.scene.add(gltf.scene);gltf.scene.updateWorldMatrix(true,true);prepareSourceRaycasts(gltf.scene);this.occluders.push(gltf.scene);
   }catch(error){if(!this.disposed)console.warn('Optional race landmark unavailable.',p.asset,error);}}})();
 }
 update(dt:number){
  const {player:p}=this.sim;this.actors.forEach((actor,i)=>{const r=this.sim.riders[i];actor.position.set(r.x,r.y,r.z);actor.rotation.y=r.heading;actor.rotation.z=this.reducedMotion?0:Math.sin(r.heading)*Math.min(.04,r.driftCharge*.03);this.mixers[i].setTime(this.sim.elapsed*Math.max(.15,r.speed/10));});
  const gate=this.sim.course.at((p.gates+1)*this.sim.course.gateSpacing);this.gates.position.set(gate.x,gate.y,gate.z);this.gates.rotation.y=gate.heading;
  if(this.bannerGate!==p.gates){this.bannerGate=p.gates;const ctx=this.banner.getContext('2d');if(ctx){ctx.fillStyle='#baa47c';ctx.fillRect(0,0,512,64);ctx.fillStyle='#30261c';ctx.font='bold 28px Georgia';ctx.textAlign='center';ctx.fillText(`PASSAGE ${(p.gates%this.sim.course.gateCount)+1} / ${this.sim.course.gateCount}`,256,42);this.bannerTexture.needsUpdate=true;}}
  this.pickupMeshes.forEach((m,i)=>{m.visible=this.sim.pickups[i].availableAt<=this.sim.elapsed;m.rotation.y=this.sim.elapsed*1.3;});
  this.oilMeshes.forEach((m,i)=>{const oil=this.sim.oil[i];m.visible=Boolean(oil);if(oil)m.position.set(oil.x,this.sim.course.project({x:oil.x,y:0,z:oil.z}).y+.07,oil.z);});
  this.dustClock+=dt;if(this.sim.phase==='racing'&&p.speed>5&&this.dustClock>.035){this.dustClock=0;const i=this.dustCursor++%150;this.dustArray[i*3]=p.x-Math.sin(p.heading)*1.2+(Math.random()-.5)*.6;this.dustArray[i*3+1]=p.y+.2;this.dustArray[i*3+2]=p.z-Math.cos(p.heading)*1.2;}
  for(let i=0;i<150;i++)this.dustArray[i*3+1]+=dt*.14;this.dustGeometry.attributes.position.needsUpdate=true;
  const behind=8+p.speed*.14;this.desired.set(p.x-Math.sin(p.heading)*behind,p.y+4.7,p.z-Math.cos(p.heading)*behind);this.target.set(p.x+Math.sin(p.heading)*8,p.y+1.1,p.z+Math.cos(p.heading)*8);
  if(!this.initialized){this.camera.position.copy(this.desired);this.look.copy(this.target);this.initialized=true;}else{this.camera.position.lerp(this.desired,1-Math.exp(-dt*5));this.look.lerp(this.target,1-Math.exp(-dt*7));}this.camera.lookAt(this.look);
  const fov=this.reducedMotion?57:57+Math.min(8,p.speed*.28);if(Math.abs(this.camera.fov-fov)>.05){this.camera.fov=fov;this.camera.updateProjectionMatrix();}this.playerTarget.set(p.x,p.y+1,p.z);this.occlusionRay.ray.origin.copy(this.camera.position);this.occlusionRay.ray.direction.subVectors(this.playerTarget,this.camera.position);this.occlusionRay.far=Math.max(0,this.occlusionRay.ray.direction.length()-.2);this.occlusionRay.ray.direction.normalize();this.occlusion.update(this.occlusionRay,this.playerTarget,dt);this.renderer.render(this.scene,this.camera);
 }
 dispose(){if(this.disposed)return;this.disposed=true;this.observer.disconnect();this.mixers.forEach(m=>m.stopAllAction());this.models.forEach(m=>{if(!m.parent)this.scene.add(m);});this.occlusion.dispose();this.disposeObject(this.scene);this.renderer.dispose();this.renderer.forceContextLoss();this.canvas.remove();this.scene.clear();}
}
