import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const only=(process.argv[3]??'').split(',').filter(Boolean);
const stage=process.argv[2]??'final',out=`data/runtime/valentine/test-artifacts/headless-map-2026-10-23/survey-${stage}`;
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1200,height:850}});
const report={at:new Date().toISOString(),errors:[],cases:[],scope:'DEV relocation onto sampled terrain 2m beyond each ramp; real mouse approach, entrance and exit. Does not prove arbitrary town routes or original portal accuracy.'};
page.on('pageerror',error=>report.errors.push(error.message));
const world=(c,p)=>{const x=p.x-c.x,z=p.z-c.z,co=Math.cos(c.yaw??0),si=Math.sin(c.yaw??0);return{x:c.x+x*co+z*si,y:p.y,z:c.z-x*si+z*co};};
let roomWalkDiagnostic;
async function roomWalk(c,target){
 const path=await page.evaluate(({c,target})=>{const a=window.__rdoPreview,start=a.getState().player;if(a.probeMove(start,target).allowed)return[target];
  const step=.8,open=[],nodes=new Map(),closed=new Set(),co=Math.cos(c.yaw??0),si=Math.sin(c.yaw??0);
  const node=(ix,iz)=>{const k=ix+':'+iz;if(nodes.has(k))return nodes.get(k);const x=start.x+ix*step,z=start.z+iz*step,n={k,ix,iz,x,z,y:c.floorY,cost:Infinity};nodes.set(k,n);return n;};
  const first=node(0,0);first.cost=0;open.push(first);let end;
  while(open.length&&closed.size<2000){open.sort((p,q)=>p.cost+Math.hypot(p.x-target.x,p.z-target.z)-q.cost-Math.hypot(q.x-target.x,q.z-target.z));const p=open.shift();if(closed.has(p.k))continue;closed.add(p.k);if(Math.hypot(p.x-target.x,p.z-target.z)<2&&a.probeMove(p,target).allowed){end=p;break;}
   for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const q=node(p.ix+dx,p.iz+dz),lx=(q.x-c.x)*co-(q.z-c.z)*si,lz=(q.x-c.x)*si+(q.z-c.z)*co,cost=p.cost+Math.hypot(dx,dz)*step;if(closed.has(q.k)||Math.abs(lx)>c.width/2-.5||Math.abs(lz)>c.depth/2-.5||cost>=q.cost||!a.probeMove(p,q).allowed)continue;q.cost=cost;q.parent=p;open.push(q);}}
  if(!end)return null;const points=[target];for(let p=end;p;p=p.parent)points.push({x:p.x,y:p.y,z:p.z});points.reverse();const result=[];for(let i=0;i<points.length-1;){let j=points.length-1;while(j>i+1&&!a.probeMove(points[i],points[j]).allowed)j--;result.push(points[j]);i=j;}return result;
 },{c,target});
 roomWalkDiagnostic={target,path};if(!path)return false;
 for(const point of path){const pixel=await page.evaluate(p=>window.__rdoPreview.project(p),point);roomWalkDiagnostic.click={pixel,pick:await page.evaluate(p=>window.__rdoPreview.probeClick(p.x,p.y),pixel)};await page.mouse.click(pixel.x,pixel.y);try{await page.waitForFunction(p=>{const s=window.__rdoPreview.getState();return !s.moveTarget&&Math.hypot(s.player.x-p.x,s.player.z-p.z)<.4;},point,{timeout:12000});}catch{roomWalkDiagnostic.state=await page.evaluate(()=>window.__rdoPreview.getState());roomWalkDiagnostic.recovery=await page.evaluate(()=>window.__rdoPreview.getRecoveryState());return false;}await page.waitForTimeout(700);}
 return true;
}
try{
 await page.goto('http://127.0.0.1:4178/');await page.locator('[data-game-ready=true]').waitFor({timeout:60000});
 const registry=JSON.parse(await readFile('data/reference/valentine/buildings/registry.json','utf8'));
 for(const ref of registry.buildings){
  if(only.length&&!only.includes(ref.id))continue;
  const building=JSON.parse(await readFile(`data/reference/valentine/buildings/${ref.file}`,'utf8'));
  const floor=building.interior.floorDefinitions.find(f=>f.id==='ground');if(!floor)continue;
  const c=JSON.parse(await readFile(`data/reference/valentine/buildings/${ref.id}/${floor.file}`,'utf8')).layout;
  const foot=world(c,{x:c.doorX,y:c.rampLow,z:c.rampStart}),from=world(c,{x:c.doorX,y:0,z:c.rampStart+c.frontDirection*2}),to=world(c,{x:c.doorX,y:c.floorY,z:c.front-c.frontDirection*1.2}),entry={id:ref.id,from,foot,to};report.cases.push(entry);
  from.y=await page.evaluate(p=>window.__rdoPreview.sampleGround(p.x,p.z),from);
  if(await page.locator('.rdo-venue').count())await page.keyboard.press('Escape');
  if(await page.locator('.rdo-context').count())await page.locator('.rdo-context').getByRole('button',{name:'Schließen',exact:true}).click();
  await page.keyboard.press('0');
  await page.evaluate(p=>window.__rdoPreview.teleport(p),from);await page.evaluate(()=>window.__rdoPreview.waitForChunks());await page.waitForTimeout(1300);
  if(Math.abs(Math.cos(c.yaw??0))<.15){await page.keyboard.down('e');await page.waitForTimeout(450);await page.keyboard.up('e');await page.waitForTimeout(700);entry.cameraRotatedWithKeyboard=true;}
  entry.before=await page.evaluate(()=>window.__rdoPreview.getState());
  entry.probe=await page.evaluate(({from,to})=>window.__rdoPreview.probeMove(from,to),{from:entry.before.player,to});
  await page.screenshot({path:`${out}/${ref.id}-outside.png`});
  // Aim at the first tread's center, not a zero-area triangle boundary. The
  // approach still begins on actual terrain outside the complete access ramp.
  const length=Math.abs(c.rampStart-c.front),tread=world(c,{x:c.doorX,y:c.rampLow+(c.floorY-c.rampLow)*.3/length,z:c.rampStart-c.frontDirection*.3});
  const footPixel=await page.evaluate(p=>window.__rdoPreview.project(p),tread);
  entry.clickDiagnostics=await page.evaluate(p=>({pixel:p,active:document.activeElement?.outerHTML.slice(0,400),target:document.elementFromPoint(p.x,p.y)?.outerHTML.slice(0,400)}),footPixel);
  entry.pickProbe=await page.evaluate(p=>{try{return window.__rdoPreview.probeClick(p.x,p.y);}catch(error){return{error:String(error),stack:error.stack};}},footPixel);
  await page.mouse.click(footPixel.x,footPixel.y);
  try{await page.waitForFunction(p=>{const s=window.__rdoPreview.getState();return !s.moveTarget&&Math.hypot(s.player.x-p.x,s.player.z-p.z)<.25;},entry.pickProbe.point??tread,{timeout:6000});entry.approached=true;}
  catch{entry.approached=false;entry.approachRecovery=await page.evaluate(()=>window.__rdoPreview.getRecoveryState());}
  // Finish the approach and its camera easing before aiming the next world
  // point; projecting while still walking can turn a door click into a deck click.
  await page.waitForTimeout(1200);
  const door=world(c,{x:c.doorX,y:c.floorY+.9,z:c.front});entry.door=door;
  const pixel=await page.evaluate(to=>window.__rdoPreview.project(to),door);await page.mouse.click(pixel.x,pixel.y);
  try{await page.waitForFunction(id=>{const s=window.__rdoPreview.getState();return s.context.mode==='indoor'&&s.context.buildingId===id;},ref.id,{timeout:5000});entry.entered=true;}
  catch{entry.entered=false;entry.menu=await page.locator('.rdo-context').textContent().catch(()=>null);entry.recovery=await page.evaluate(()=>window.__rdoPreview.getRecoveryState());}
  entry.after=await page.evaluate(()=>window.__rdoPreview.getState());
  if(entry.entered){
   await page.waitForTimeout(1000);const options=[[c.x,c.z],[c.x,c.z+c.depth*.16],[c.x-c.width*.2,c.z],[c.x+c.width*.2,c.z],[c.doorX,c.front-c.frontDirection*Math.min(2.5,c.depth*.65)]].map(([x,z])=>world(c,{x,y:c.floorY,z}));
   const target=await page.evaluate(points=>{const a=window.__rdoPreview,from=a.getState().player;for(const p of points){if(Math.hypot(from.x-p.x,from.z-p.z)<.5)continue;const result=a.probeMove(from,p);if(result.allowed&&Math.abs(result.position.y-p.y)<.12)return p;}return null;},options);
   if(target){const pixel=await page.evaluate(p=>window.__rdoPreview.project(p),target);await page.mouse.click(pixel.x,pixel.y);try{await page.waitForFunction(p=>{const s=window.__rdoPreview.getState();return !s.moveTarget&&Math.hypot(s.player.x-p.x,s.player.z-p.z)<.4;},target,{timeout:12000});entry.interiorWalk=true;entry.interiorTarget=target;}catch{entry.interiorWalk=false;}}
   else {entry.interiorWalk=false;for(const target of options){if(await roomWalk(c,target)){entry.interiorWalk=true;entry.interiorTarget=target;break;}}}
  }
  await page.screenshot({path:`${out}/${ref.id}-inside.png`});
  if(entry.entered){
   // Exit actions become available near the door; walk back from the room survey
   // before clicking the doorway instead of expecting an action across the room.
   const inner=world(c,{x:c.doorX,y:c.floorY,z:c.front-c.frontDirection*.65});
   entry.exitApproached=await roomWalk(c,inner);entry.exitApproachDiagnostic=roomWalkDiagnostic;
   await page.waitForTimeout(1200);
   const exitPixel=await page.evaluate(p=>window.__rdoPreview.project(p),door);await page.mouse.click(exitPixel.x,exitPixel.y);
   try{await page.waitForFunction(()=>{const s=window.__rdoPreview.getState();return s.context.mode!=='indoor'&&!s.moveTarget;},undefined,{timeout:15000});entry.exited=true;}
   catch{entry.exited=false;entry.exitMenu=await page.locator('.rdo-context').textContent().catch(()=>null);}
   entry.outside=await page.evaluate(()=>window.__rdoPreview.getState());
   entry.exitTerrain=await page.evaluate(()=>{const a=window.__rdoPreview,p=a.getState().player;return a.sampleGround(p.x,p.z);});entry.reachedTerrain=Number.isFinite(entry.exitTerrain)&&Math.abs(entry.outside.player.y-entry.exitTerrain)<.12;
   await page.screenshot({path:`${out}/${ref.id}-exit.png`});
  }
  await writeFile(`${out}/progress.json`,JSON.stringify(report,null,2));

 }
 report.passed=report.errors.length===0&&report.cases.every(c=>c.approached&&c.entered&&c.interiorWalk&&c.exitApproached&&c.exited&&c.reachedTerrain&&c.probe.allowed&&Math.abs(c.probe.position.y-c.to.y)<.12);
}catch(error){report.failure=String(error);report.passed=false;}
finally{await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify({passed:report.passed,errors:report.errors,failure:report.failure,cases:report.cases.map(c=>({id:c.id,entered:c.entered,exited:c.exited,probe:c.probe}))}));
if(!report.passed)process.exitCode=1;
