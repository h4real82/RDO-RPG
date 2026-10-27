import {chromium} from 'playwright';import {mkdir,readFile,writeFile} from 'node:fs/promises';
const out='data/runtime/valentine/interior-intake-2026-10-24/rooms';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1000,height:750}}),report={errors:[],cases:[]};
page.on('pageerror',e=>report.errors.push(e.message));
const world=(c,p)=>{const dx=p.x-c.x,dz=p.z-c.z,co=Math.cos(c.yaw??0),si=Math.sin(c.yaw??0);return{x:c.x+dx*co+dz*si,y:p.y,z:c.z-dx*si+dz*co};};
try{
 await page.goto('http://127.0.0.1:4178/');await page.locator('[data-game-ready=true]').waitFor({timeout:60000});await page.evaluate(()=>window.__rdoPreview.waitForChunks());
 for(const id of ['station','doctor','gunsmith','hotel','val-03-jail-ext','general-store','second-saloon','smithfields-saloon']){
  const c=JSON.parse(await readFile(`data/reference/valentine/buildings/${id}/floors/ground.json`,'utf8')).layout;
  const from=world(c,{x:c.doorX,y:c.rampLow,z:c.rampStart}),inside=world(c,{x:c.doorX,y:c.floorY,z:c.front-c.frontDirection*1.2});
  await page.evaluate(p=>window.__rdoPreview.teleport(p),inside);await page.evaluate(()=>window.__rdoPreview.waitForChunks());await page.waitForTimeout(800);
  const r=await page.evaluate(({from,inside,id})=>({id,state:window.__rdoPreview.getState(),route:window.__rdoPreview.probeMove(from,inside),visuals:window.__rdoPreview.getInteriorVisuals().filter(v=>v.room.startsWith(id+'/'))}),{from,inside,id});
  r.passed=r.route.allowed&&r.state.context.mode==='indoor'&&r.state.context.buildingId===id&&r.visuals.every(v=>v.texturedMeshes>0&&!v.missing.length);report.cases.push(r);
  await page.screenshot({path:`${out}/${id}.png`});
  if(id==='hotel'){
   const upper=JSON.parse(await readFile('data/reference/valentine/buildings/hotel/floors/upper.json','utf8')).layout;
   await page.evaluate(p=>window.__rdoPreview.teleport(p),world(upper,{x:upper.x,y:upper.floorY,z:upper.z}));await page.waitForTimeout(1000);await page.screenshot({path:out+'/hotel-upper.png'});
  }
 }
 report.passed=!report.errors.length&&report.cases.every(r=>r.passed);
}catch(e){report.passed=false;report.failure=String(e);}
finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify({passed:report.passed,failure:report.failure,errors:report.errors,cases:report.cases.map(r=>({id:r.id,passed:r.passed,hit:r.route.hit,reason:r.route.reason}))}));if(!report.passed)process.exitCode=1;
