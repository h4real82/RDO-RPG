import{chromium}from'playwright';import{readFile,mkdir,writeFile}from'node:fs/promises';
const out='data/runtime/valentine/livery-race-2026-10-24';await mkdir(out,{recursive:true});const report={errors:[],cases:[],scope:'DEV relocation plus real input to dealer, race controls and return; no full town/online acceptance'};
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1280,height:900}});page.on('pageerror',e=>report.errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:4178/');await page.locator('[data-game-ready=true]').waitFor({timeout:60000});
 await page.evaluate(()=>window.__rdoPreview.waitForChunks());await page.waitForTimeout(1200);
 const layout=JSON.parse(await readFile('data/reference/valentine/buildings/val-03-stable-ext/floors/ground.json','utf8')).layout;
 const world=p=>{const c=layout,x=p.x-c.x,z=p.z-c.z;return{x:c.x+x*Math.cos(c.yaw)+z*Math.sin(c.yaw),y:p.y,z:c.z-x*Math.sin(c.yaw)+z*Math.cos(c.yaw)};};
 const b=JSON.parse(await readFile('data/reference/valentine/buildings/val-03-stable-ext/building.json','utf8'));
 for(const [i,variantId]of ['circuit-sprint','valentine-kart'].entries()){const action=b.actions[0];
  await page.evaluate(async p=>{window.__rdoPreview.teleport(p);await window.__rdoPreview.waitForChunks();},world(action.interactionPosition));await page.waitForTimeout(600);report.diagnostics=await page.evaluate(()=>({state:window.__rdoPreview.getState(),recovery:window.__rdoPreview.getRecoveryState(),rooms:window.__rdoPreview.getInteriorVisuals()}));await page.keyboard.press('f');
  await page.getByRole('dialog',{name:'Livery · Pferdehändler',exact:true}).getByRole('button',{name:i?'Hufeisen-Rallye · Valentine Kart':'Staub & Sekunden',exact:true}).click();
  const panel=page.getByRole('dialog',{name:i?'Hufeisen-Rallye · Valentine Kart':'Staub & Sekunden'});await panel.waitFor();await panel.getByRole('button',{name:'Aufsitzen & starten',exact:true}).waitFor({timeout:60000});
  await page.waitForTimeout(1200);await page.screenshot({path:`${out}/${i}-ready.png`});await panel.getByRole('button',{name:'Aufsitzen & starten',exact:true}).click();
  await page.waitForTimeout(3400);await page.keyboard.down('w');await page.waitForTimeout(1800);await page.keyboard.up('w');const moving=await panel.locator('.rdo-race__hud').textContent();
  await page.keyboard.press('p');await page.waitForTimeout(100);const paused=await panel.locator('.rdo-race__hud').textContent();await page.waitForTimeout(500);const still=await panel.locator('.rdo-race__hud').textContent();
  await page.screenshot({path:`${out}/${i}-racing.png`});await panel.getByRole('button',{name:'Zurück zum Raum',exact:true}).click();await page.waitForTimeout(300);
  report.cases.push({mainContextHealthy:await page.evaluate(()=>{const canvas=document.querySelector('#game-container > canvas');const gl=canvas?.getContext('webgl2')??canvas?.getContext('webgl');return Boolean(gl&&!gl.isContextLost());}),id:variantId,moving,paused,still,pauseHoldsTime:paused===still,closed:await page.locator('.rdo-race').count()===0,context:await page.evaluate(()=>window.__rdoPreview.getState().context)});
 }
 for(const[name,x,z,height]of[['camp',-300,-705,40],['church-north',-220,-845,65],['forest-north',-360,-1025,100],['livery-yard',-369,-789,44]]){
  await page.evaluate(async({x,z,height})=>{const a=window.__rdoPreview,y=a.sampleGround(x,z)??120;a.teleport({x,y,z});await a.waitForChunks();a.setReferenceCamera({x:x+25,y:y+45,z:z+30},{x,y,z},height);},{x,z,height});await page.waitForTimeout(700);await page.screenshot({path:`${out}/${name}.png`});
 }
 report.passed=!report.errors.length&&report.cases.length===2&&report.cases.every(c=>c.mainContextHealthy&&c.pauseHoldsTime&&c.closed&&c.context.buildingId===b.id);
}catch(e){report.failure=String(e);report.state=await page.evaluate(()=>window.__rdoPreview?.getState());report.body=(await page.locator('body').innerText()).slice(-2400);await page.screenshot({path:out+'/failure.png'});report.passed=false;}
finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();}console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
