import {chromium} from 'playwright';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const stage=process.argv[2]??'before',out=`data/runtime/valentine/test-artifacts/entrance-feedback-2026-10-24/${stage}`;
await mkdir(out,{recursive:true});
const world=(c,p)=>{const dx=p.x-c.x,dz=p.z-c.z,co=Math.cos(c.yaw??0),si=Math.sin(c.yaw??0);return{x:c.x+dx*co+dz*si,y:p.y,z:c.z-dx*si+dz*co};};
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1200,height:850}}),report={errors:[],cases:[]};
page.on('pageerror',e=>report.errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:4178/');await page.locator('[data-game-ready=true]').waitFor({timeout:60000});await page.evaluate(()=>window.__rdoPreview.waitForChunks());
 for(const ref of JSON.parse(await readFile('data/reference/valentine/buildings/registry.json','utf8')).buildings){
  const base=`data/reference/valentine/buildings/${ref.id}/`,b=JSON.parse(await readFile(base+'building.json','utf8')),f=b.interior.floorDefinitions.find(f=>f.id==='ground');if(!f)continue;
  const c=JSON.parse(await readFile(base+f.file,'utf8')).layout;
  const start=world(c,{x:c.doorX,y:0,z:c.rampStart+c.frontDirection*2}),foot=world(c,{x:c.doorX,y:c.rampLow,z:c.rampStart}),inside=world(c,{x:c.doorX,y:c.floorY,z:c.front-c.frontDirection*1.2});
  const result=await page.evaluate(({start,foot,inside})=>{const api=window.__rdoPreview;start.y=api.sampleGround(start.x,start.z);return{start,foot,inside,footTerrain:api.sampleGround(foot.x,foot.z),probe:api.probeMove(start,inside)};},{start,foot,inside});
  result.id=ref.id;result.reachesFloor=result.probe.allowed&&Math.abs(result.probe.position.y-c.floorY)<.15;report.cases.push(result);
 }
 report.passed=report.errors.length===0&&report.cases.every(c=>c.reachesFloor);
}catch(error){report.failure=String(error);report.passed=false;}
finally{await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify({passed:report.passed,failure:report.failure,errors:report.errors,cases:report.cases.map(c=>({id:c.id,reachesFloor:c.reachesFloor,footGap:c.foot.y-c.footTerrain,reason:c.probe.reason,hit:c.probe.hit,actualY:c.probe.position.y}))}));
if(!report.passed)process.exitCode=1;
