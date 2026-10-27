import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import sharp from 'sharp';

const snapshot=process.argv[2]??'D:/Projects/RDO-RPG/data/runtime/valentine/finished-map-2026-10-24';
const {url}=JSON.parse(await readFile(`${snapshot}/server-ready.json`,'utf8'));
const out='data/runtime/valentine/completion-2026-10-24/production';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1200,height:850}});
const report={at:new Date().toISOString(),url,snapshot,errors:[],assetFailures:[],scope:'Packaged production map starts without DEV hooks; physical WASD/Shift movement and menu round trip. Full building/route acceptance is recorded separately against the identical source build.'};
page.on('pageerror',error=>report.errors.push(error.message));
page.on('response',response=>{if(response.status()>=400&&/\/(runtime|assets)\//.test(response.url()))report.assetFailures.push({url:response.url(),status:response.status()});});
try{
 await page.goto(url);await page.locator('[data-game-ready=true]').waitFor({timeout:90000});await page.waitForTimeout(2500);
 assert.equal(await page.evaluate(()=>typeof window.__rdoPreview),'undefined','Production must not expose DEV relocation or probes.');
 report.version=await(await page.request.get(new URL('__map-version.json',url).href)).json();
 const canvas=page.locator('canvas').first();await canvas.screenshot({path:`${out}/spawn.png`});
 const before=await canvas.screenshot();
 await page.keyboard.down('w');await page.keyboard.down('Shift');await page.waitForTimeout(1600);await page.keyboard.up('Shift');await page.keyboard.up('w');await page.waitForTimeout(1000);
 const after=await canvas.screenshot();await writeFile(`${out}/walk.png`,after);
 const a=await sharp(before).removeAlpha().raw().toBuffer(),b=await sharp(after).removeAlpha().raw().toBuffer();
 let changed=0;for(let i=0;i<a.length;i+=3)if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>60)changed++;
 report.changedPixels=changed;assert.ok(changed>15000,'Movement must visibly change the production scene.');
 await canvas.click({button:'right',position:{x:600,y:425}});await page.waitForTimeout(250);report.menu=await page.locator('body').innerText();await page.screenshot({path:`${out}/menu.png`});
 assert.equal(await page.getByRole('button',{name:'Schließen',exact:true}).count(),1,'Context menu always offers a close action.');
 await page.keyboard.press('Escape');await page.waitForTimeout(250);await page.screenshot({path:`${out}/resumed.png`});
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.assetFailures,[]);report.passed=true;
}catch(error){report.failure=String(error);report.passed=false;await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});}
finally{await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
