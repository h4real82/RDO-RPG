import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='data/runtime/valentine/interior-intake-2026-10-24/models';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1400,height:1000}});
await page.route('**/reference-furniture-library',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><body style="margin:0;background:#858279"></body>'}));
try{
 await page.goto('http://127.0.0.1:4178/reference-furniture-library');
 const report=await page.evaluate(async()=>{
  const source=await(await fetch('/src/game/interiors/ReferenceFurniture.ts')).text(),url=source.match(/from\s*["']([^"']*\/three\.js[^"']*)/)[1],T=await import(url);
  const {createReferenceFurniture,REFERENCE_FURNITURE_KINDS}=await import('/src/game/interiors/ReferenceFurniture.ts');
  const {GLTFExporter}=await import('/node_modules/three/examples/jsm/exporters/GLTFExporter.js');
  const {batchAuthoredFurniture}=await import('/src/game/interiors/FurnitureBatch.ts');
  const loader=new T.TextureLoader(),base='/runtime/valentine/verified-scene/interiors/';
  const wood=await loader.loadAsync(base+'smithfields-saloon/textures/val_cs_salwoodtrim00_ab.png'),body=await loader.loadAsync(base+'authored-reference/textures/val_sal2_woodplank03_ab.png'),rug=await loader.loadAsync(base+'hotel/textures/val_hotel_rug_01_ab.png');
  for(const texture of [wood,body,rug])texture.colorSpace=T.SRGBColorSpace;
  const sizes={'chair':[.65,1.15,.65],'desk':[1.8,.9,1],'dresser':[1.3,1,.65],'wardrobe':[1.4,2.2,.65],'armchair':[.95,1.1,.9],'sofa':[2.1,1.05,.9],'washstand':[.95,.9,.65],'stove':[.65,2,.65],'rifle-rack':[2.1,2.2,.5],'medicine-cabinet':[2.1,2.3,.5],'goods-shelf':[2.1,2.3,.55],'ticket-booth':[3,2.6,2.3],'cell-bars':[2.2,2.5,.15],'crate-stack':[1.4,1.2,1],'exam-cot':[1,.9,2],'folding-chair':[.6,1,.6],'cash-register':[.55,.5,.45],'plain-table':[1.8,.85,1]};
  const scene=new T.Scene();scene.background=new T.Color('#858279');scene.add(new T.HemisphereLight('#fff4dc','#62594f',2.3));const light=new T.DirectionalLight('#ffffff',3);light.position.set(-4,10,8);scene.add(light);
  const gallery=new T.Group(),models=[],exporter=new GLTFExporter();scene.add(gallery);
  for(const [i,kind] of REFERENCE_FURNITURE_KINDS.entries()){
   const [w,h,d]=sizes[kind],model=createReferenceFurniture(kind,w,d,h);model.userData.textureProvenance='Own geometry/UVs, existing source albedo; not an original furniture mesh';
   let triangles=0,textured=0;model.traverse(o=>{if(o.isMesh){triangles+=(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3;const role=o.material.userData.interiorRole;if(['wood','furnitureWood','rug'].includes(role)){o.material.map=role==='wood'?wood:role==='furnitureWood'?body:rug;o.material.needsUpdate=true;textured++;}}});
   const binary=await exporter.parseAsync(model,{binary:true,onlyVisible:true});let raw='';for(const b of new Uint8Array(binary))raw+=String.fromCharCode(b);
   models.push({kind,triangles,textured,bytes:binary.byteLength,base64:btoa(raw)});
   model.position.set((i%6-2.5)*3.5,0,(Math.floor(i/6)-1)*3.4);gallery.add(model);
  }
  batchAuthoredFurniture(gallery);
  const camera=new T.OrthographicCamera(-12,12,8.57,-8.57,.1,200);camera.position.set(0,16,17);camera.lookAt(0,0,0);
  const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(1400,1000);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;document.body.append(renderer.domElement);renderer.render(scene,camera);
  for(const [i,model]of gallery.children.entries()){const p=model.position.clone();p.z+=1.3;p.project(camera);const label=document.createElement('span');label.textContent=REFERENCE_FURNITURE_KINDS[i];label.style.cssText=`position:absolute;left:${(p.x+1)*700}px;top:${(1-p.y)*500}px;transform:translateX(-50%);font:14px Georgia;color:white;text-shadow:1px 1px black`;document.body.append(label);}
  return models;
 });
 for(const model of report){await writeFile(`${out}/${model.kind}.glb`,Buffer.from(model.base64,'base64'));delete model.base64;}
 await page.screenshot({path:out+'/library.png'});await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({models:report.length,triangles:report.reduce((n,m)=>n+m.triangles,0),bytes:report.reduce((n,m)=>n+m.bytes,0)}));
}finally{await browser.close();}
