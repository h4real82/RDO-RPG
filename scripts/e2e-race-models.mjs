import{chromium}from'playwright';import{mkdir,writeFile}from'node:fs/promises';
const out='data/runtime/valentine/livery-race-2026-10-24';await mkdir(out,{recursive:true});const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1200,height:800}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
// Standalone exact RaceView adapter, isolated from the running world's state.
await page.route('http://127.0.0.1:4178/',route=>route.fulfill({contentType:'text/html',body:'<body style="margin:0"><div id="view" style="width:1200px;height:800px"></div></body>'}));
let report;
try{await page.goto('http://127.0.0.1:4178/');report=await page.evaluate(async()=>{
 const {RaceView}=await import('/src/game/minigames/horse-race/RaceView.ts'),{RaceSimulation,makeCourse}=await import('/src/game/minigames/horse-race/RaceSimulation.ts');
 const source=await(await fetch('/src/game/minigames/horse-race/RaceView.ts')).text(),url=[...source.matchAll(/from\s*["']([^"']+)["']/g)].map(m=>m[1]).find(p=>p.includes('/three.js')),T=await import(url);
 const courseUrl=[...source.matchAll(/from\s*["']([^"']+)["']/g)].map(m=>m[1]).find(p=>p.includes('scenery.json')).replace('scenery.json?import','course.json');
 const data=await(await fetch(courseUrl)).json(),sim=new RaceSimulation(makeCourse(data.points),{mode:'arcade',laps:3,rivals:3,halfWidth:4,name:'Mounted model visual probe'}),view=new RaceView(document.getElementById('view'),sim,false);await view.load(()=>{});view.update(1/60);
 const groups=view.scene.children.map(group=>{const meshes=[];group.traverse(object=>{if(object.isSkinnedMesh)meshes.push(object);});return meshes;}).filter(meshes=>meshes.length===10);
 const invalid=groups.flat().filter(mesh=>Array.isArray(mesh.material)&&mesh.geometry.groups.length===0);
 const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(1200,800);document.body.replaceChildren(renderer.domElement);const p=sim.player,camera=new T.PerspectiveCamera(45,1.5,.1,400);camera.position.set(p.x+10,p.y+7,p.z+10);camera.lookAt(p.x,p.y+1,p.z-3);renderer.render(view.scene,camera);
 window.__raceModelCleanup=()=>{view.dispose();renderer.dispose();renderer.forceContextLoss();};
 return{scope:'Standalone exact RaceView render adapter, no gameplay state acceptance',actors:groups.length,skinnedPrimitives:groups.flat().length,invalidGroupLessMaterialArrays:invalid.length,drawCalls:renderer.info.render.calls,passed:groups.length===4&&invalid.length===0};
 });await page.screenshot({path:`${out}/four-mounted-riders-final.png`});await page.evaluate(()=>window.__raceModelCleanup());report.errors=errors;report.passed&&=!errors.length;
}catch(error){report={passed:false,error:String(error),errors};}finally{await writeFile(`${out}/mounted-models-report.json`,JSON.stringify(report,null,2));await browser.close();}console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
