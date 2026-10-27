import {chromium} from 'playwright';import {mkdir,writeFile} from 'node:fs/promises';
const out='data/runtime/valentine/world-data-audit-2026-10-24/views';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1100,height:800}}),report={errors:[],cases:[],scope:'DEV relocation, focused terrain walking probes and environment images; not full map acceptance'};
page.on('pageerror',e=>report.errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:4178/');await page.locator('[data-game-ready=true]').waitFor({timeout:60000});await page.evaluate(()=>window.__rdoPreview.waitForChunks());
 for(const [name,x,z]of [['native-edge-west',-447.33,-923.33],['native-edge-northwest',-439.33,-933.33],['church-shade',-246.6,-784],['source-gate',-246.7488,-659.7882]]){
  const result=await page.evaluate(async({name,x,z})=>{const api=window.__rdoPreview,y=api.sampleGround(x,z);if(!Number.isFinite(y))return{name,error:'no walkable support'};
   api.teleport({x,y,z});await api.waitForChunks();api.setReferenceCamera({x:x+22,y:y+28,z:z+25},{x,y,z},35);
   const a={x,y,z},b={x:x+.4,y,z};return{name,y,probe:api.probeMove(a,b),expectedWalk:name!=='native-edge-west',state:api.getState(),performance:api.getPerformance()};},{name,x,z});
  await page.waitForTimeout(800);await page.screenshot({path:`${out}/${name}.png`});report.cases.push(result);
 }
 report.scene=await page.evaluate(()=>{const m=window.__rdoPreview.getSceneState();return{placements:m.placements.length,uniqueIds:new Set(m.placements.map(p=>p.id)).size,gate:m.placements.filter(p=>p.asset.endsWith('val_01_emrfencegate02x_open.glb')).length,sheriff:m.placements.filter(p=>p.asset.endsWith('val_shrffhs.glb')).length};});
 // Independent native edge profiles show the western segment crosses a real
 // non-walkable face. Preserve that restriction; the northern flat landing walks.
 report.passed=!report.errors.length&&report.cases.every(c=>!c.error&&c.probe?.allowed===c.expectedWalk)&&report.scene.placements===report.scene.uniqueIds&&report.scene.gate===1&&report.scene.sheriff===1;
}catch(e){report.passed=false;report.failure=String(e);}
finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify({passed:report.passed,failure:report.failure,errors:report.errors,cases:report.cases.map(c=>({name:c.name,error:c.error,walk:c.probe?.allowed,reason:c.probe?.reason})),scene:report.scene}));if(!report.passed)process.exitCode=1;
