import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const [asset,name]=process.argv.slice(2);
if(!asset||!name||!/^[a-z0-9-]+$/.test(name))throw new Error('Usage: /runtime/.../model.glb review-name');
const out='data/runtime/valentine/test-artifacts/headless-map-2026-10-23/glb-review';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1000,height:800}});
await page.route('**/codex-glb-review',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><body style="margin:0"></body>'}));
const bytes=await readFile(asset.startsWith('/runtime/')?'data'+asset:asset);
await page.route('**/codex-review-asset.glb',route=>route.fulfill({contentType:'model/gltf-binary',body:bytes}));
try{
 await page.goto('http://127.0.0.1:4178/codex-glb-review');
 const report=await page.evaluate(async({asset,originalAsset,runtimePreview})=>{
  const T=await import('/node_modules/three/build/three.module.js'),{GLTFLoader}=await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');
  const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(1000,800);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;document.body.append(renderer.domElement);
  const scene=new T.Scene();scene.background=new T.Color('#647785');scene.add(new T.HemisphereLight('#ffffff','#77614c',2.2));
  const light=new T.DirectionalLight('#fff3dc',3);light.position.set(4,7,5);scene.add(light);
  const model=(await new GLTFLoader().loadAsync(asset)).scene;
  let appearance;
  if(runtimePreview){const runtime=await import('/src/game/ValentineRuntime.ts');runtime.prepareDrawableMaterialPreview(model);const {prepareSourceAppearance}=await import('/src/game/world/SourceAppearance.ts');appearance=await prepareSourceAppearance(model,{asset:originalAsset.replace('/runtime/valentine/verified-scene/','')});}
  scene.add(model);
  const box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
  const height=Math.max(size.y,size.x,size.z)*1.5,camera=new T.OrthographicCamera(-height*.625,height*.625,height*.5,-height*.5,.01,1000);
  camera.position.copy(center).add(new T.Vector3(height*.8,height*.85,height));camera.lookAt(center);renderer.render(scene,camera);
  return {asset:originalAsset,appearance,min:box.min.toArray(),max:box.max.toArray(),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles};
 },{asset:'/codex-review-asset.glb',originalAsset:asset,runtimePreview:process.argv[4]==='--runtime-preview'});
 await page.screenshot({path:`${out}/${name}.png`});await writeFile(`${out}/${name}.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}
