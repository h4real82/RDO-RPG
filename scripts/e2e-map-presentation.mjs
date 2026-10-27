import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const shell=process.argv[3]==='shell';
const stage=process.argv[2]??'final',out=`data/runtime/valentine/test-artifacts/headless-map-2026-10-23/presentation-${stage}`;
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1200,height:850}});
const report={at:new Date().toISOString(),errors:[],views:[],scope:'Fixed viewport scene counters and mobile readability; headless counts are not a device FPS benchmark.'};
page.on('pageerror',error=>report.errors.push(error.message));
async function capture(name){
 await page.waitForTimeout(1400);
 const view=await page.evaluate(()=>({state:window.__rdoPreview.getState(),performance:window.__rdoPreview.getPerformance(),
  width:innerWidth,scrollWidth:document.documentElement.scrollWidth,canvases:document.querySelectorAll('canvas').length,
  hud:document.querySelector('aside[data-interior]')?.getBoundingClientRect().toJSON(),
  wallet:document.querySelector('.rdo-hud-wallet')?.getBoundingClientRect().toJSON(),
  devEntry:document.querySelector('#dev-app-entry')?.getBoundingClientRect().toJSON()}));view.name=name;report.views.push(view);
 assert.ok(view.hud&&view.wallet,`${name}: HUD and wallet exist`);
 const {hud,wallet}=view;assert.ok(hud.right<=view.width+1&&wallet.right<=view.width+1,`${name}: readout stays on screen`);
 assert.ok(hud.bottom<=wallet.top||wallet.bottom<=hud.top||hud.right<=wallet.left||wallet.right<=hud.left,`${name}: readout does not overlap wallet`);
 const link=view.devEntry;if(link?.width)assert.ok(hud.bottom<=link.top||link.bottom<=hud.top||hud.right<=link.left||link.right<=hud.left,`${name}: readout clear of menu entry`);
 assert.ok(view.scrollWidth<=view.width,`${name}: no horizontal overflow`);
 await page.screenshot({path:`${out}/${name}.png`});
}
try{
 await page.goto('http://127.0.0.1:4178/'+(shell?'?view=app-concept':''));
 if(shell)await page.getByRole('button',{name:'Solo-Vorschau starten',exact:true}).click({timeout:120000});
 await page.locator('[data-game-ready=true]').waitFor({timeout:60000});
 await page.evaluate(()=>window.__rdoPreview.waitForChunks());await capture('street-desktop');
 await page.evaluate(()=>window.__rdoPreview.teleport({x:-322.7,y:120.6,z:-770}));await capture('hotel-desktop');
 report.visuals=await page.evaluate(()=>window.__rdoPreview.getInteriorVisuals());
 assert.ok(report.visuals.find(r=>r.room==='hotel/upper')?.models.includes('interiors/hotel/bed-v1.glb'),'Original hotel bed loaded');
 await page.setViewportSize({width:430,height:932});await capture('hotel-mobile');
 await page.evaluate(()=>window.__rdoPreview.teleport({x:-310.1441,y:116.7,z:-788.7001}));await capture('street-mobile');
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(error){report.passed=false;report.failure=String(error);await page.screenshot({path:`${out}/failure.png`});}
finally{await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify({passed:report.passed,failure:report.failure,errors:report.errors,views:report.views.map(v=>({name:v.name,performance:v.performance}))}));
if(!report.passed)process.exitCode=1;
