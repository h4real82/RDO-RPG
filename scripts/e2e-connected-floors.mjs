import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const stage=process.argv[2]??'final',base=process.argv[3]??'http://127.0.0.1:4178';
const out=`data/runtime/valentine/test-artifacts/headless-map-2026-10-23/floors-${stage}`;
await mkdir(out,{recursive:true});
const report={at:new Date().toISOString(),errors:[],cases:[],scope:'Initial DEV relocation on lower landing; all floor changes use physical mouse and keyboard movement with collision enabled.'};
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1200,height:850}});
page.on('pageerror',error=>report.errors.push(error.message));
const state=()=>page.evaluate(()=>window.__rdoPreview.getState());
const world=(c,p)=>{const x=p.x-c.x,z=p.z-c.z,co=Math.cos(c.yaw??0),si=Math.sin(c.yaw??0);return{x:c.x+x*co+z*si,y:p.y,z:c.z-x*si+z*co};};
const click=async p=>{const pixel=await page.evaluate(p=>window.__rdoPreview.project(p),p);await page.mouse.click(pixel.x,pixel.y);};
const walk=async(start,end)=>{
 const held=new Set();
  try{
   for(let step=0;step<240;step++){
    const current=(await state()).player,dx=end.x-start.x,dz=end.z-start.z,length2=dx*dx+dz*dz;
    if(Math.hypot(current.x-end.x,current.z-end.z)<.18)break;
    const t=Math.max(0,Math.min(1,((current.x-start.x)*dx+(current.z-start.z)*dz)/length2));
    const look=Math.min(1,t+.065),target={x:start.x+dx*look,z:start.z+dz*look},wanted=new Set();
    if(target.x-current.x>.12)wanted.add('d');if(target.x-current.x<-.12)wanted.add('a');
    if(target.z-current.z>.12)wanted.add('s');if(target.z-current.z<-.12)wanted.add('w');
    for(const key of held)if(!wanted.has(key))await page.keyboard.up(key);
    for(const key of wanted)if(!held.has(key))await page.keyboard.down(key);
    held.clear();for(const key of wanted)held.add(key);await page.waitForTimeout(50);
   }
  }finally{for(const key of held)await page.keyboard.up(key);}
};
try{
 await page.goto(base);await page.locator('[data-game-ready=true]').waitFor({timeout:60000});
 await page.evaluate(()=>window.__rdoPreview.waitForChunks());
 for(const id of ['hotel','val-01-aucbarns-barn2','val-01-aucbarns-barn3','val-01-aucyard-stable2','val-06-auchouseb-ext']){
  const c=JSON.parse(await readFile(`data/reference/valentine/buildings/${id}/floors/ground.json`,'utf8')).layout;
  const stair=c.stairs[0],from=world(c,stair.from),to=world(c,stair.to),entry={id,from,to};report.cases.push(entry);
  await page.evaluate(p=>window.__rdoPreview.teleport(p),from);await page.evaluate(()=>window.__rdoPreview.waitForChunks());
  await page.waitForTimeout(1500);entry.before=await state();
  entry.probe=await page.evaluate(({from,to})=>window.__rdoPreview.probeMove(from,to),{from,to});assert.equal(entry.probe.allowed,true,`${id}: physical stair support`);
  const upperTarget=world(c,{x:stair.from.x+(stair.to.x-stair.from.x)*.995,y:stair.from.y+(stair.to.y-stair.from.y)*.995,z:stair.from.z+(stair.to.z-stair.from.z)*.995});
  entry.upperTarget=upperTarget;await click(upperTarget);entry.afterClick=await state();
  await page.waitForFunction(({id,to})=>{const s=window.__rdoPreview.getState();return s.context.buildingId===id&&s.context.floorId==='upper'&&Math.abs(s.player.y-to.y)<.3;},{id,to},{timeout:20000});
  const length=Math.hypot(to.x-from.x,to.z-from.z),landing={x:to.x+(to.x-from.x)/length*.35,y:to.y,z:to.z+(to.z-from.z)/length*.35};
  await walk(from,landing);
  assert.ok(Math.abs((await state()).player.y-to.y)<.08,`${id}: reached upper landing`);
  entry.upper=await state();await page.screenshot({path:`${out}/${id}-upper.png`});
  await walk(to,from);
  await page.waitForFunction(({id,from})=>{const s=window.__rdoPreview.getState();return s.context.buildingId===id&&s.context.floorId==='ground'&&Math.abs(s.player.y-from.y)<.15;},{id,from},{timeout:3000});
  entry.returned=await state();await page.screenshot({path:`${out}/${id}-ground.png`});entry.passed=true;
 }
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(error){report.failure=String(error);report.state=await state().catch(()=>null);report.recovery=await page.evaluate(()=>window.__rdoPreview.getRecoveryState()).catch(()=>null);report.passed=false;await page.screenshot({path:`${out}/failure.png`});}
finally{await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
