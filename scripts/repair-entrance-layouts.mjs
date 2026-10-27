import {readFile,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const base='data/reference/valentine/buildings/',read=async path=>JSON.parse(await readFile(base+path,'utf8'));
const config=await read('entrance-repair.json'),measurements=await read('rollout-source-measurements.json');
const browser=await chromium.launch({headless:true}),page=await browser.newPage();
const world=(c,p)=>{const dx=p.x-c.x,dz=p.z-c.z,co=Math.cos(c.yaw),si=Math.sin(c.yaw);return{x:c.x+dx*co+dz*si,z:c.z-dx*si+dz*co};};
try{
 await page.goto('http://127.0.0.1:4178/');await page.locator('[data-game-ready=true]').waitFor({timeout:60000});await page.evaluate(()=>window.__rdoPreview.waitForChunks());
 const changes=[];
 for(const [id,target] of Object.entries(config.buildings)){
  const file=id+'/floors/ground.json',floor=await read(file),old=floor.layout,source=measurements[id].placement.position;
  // The source geometry is baked in world axes. Rotate the authored room about
  // its own center, while preserving the measured source-local anchor.
  const yaw=target.yawDegrees*Math.PI/180,co=Math.cos(yaw),si=Math.sin(yaw),[cx,cz]=target.center;
  const next={...old,x:source.x+cx*co+cz*si,z:source.z-cx*si+cz*co,width:target.width,depth:target.depth,floorY:target.floorY,yaw,frontDirection:target.direction};
  next.doorX=next.x+target.doorX-cx;next.front=next.z+target.direction*next.depth/2;next.rampStart=next.front+target.direction*(target.accessLength??5.5);
  const foot=world(next,{x:next.doorX,z:next.rampStart});
  next.rampLow=await page.evaluate(p=>window.__rdoPreview.sampleGround(p.x,p.z),foot);
  if(!Number.isFinite(next.rampLow)||Math.abs(next.rampLow-next.floorY)>2.5)throw new Error('Unverified terrain connection '+id+' '+next.rampLow);
  next.rampLow-=.02;
  const point=p=>({...p,x:next.x+(p.x-old.x)*next.width/old.width,z:next.z+(p.z-old.z)*next.depth/old.depth,...('y'in p?{y:p.y+next.floorY-old.floorY}:{})});
  next.fixtures=old.fixtures?.map(f=>({...f,position:point(f.position)}));
  for(const fixture of next.fixtures??[]){const offset=target.fixturePositions?.[fixture.id];if(offset)fixture.position={x:next.x+offset[0],y:next.floorY,z:next.z+offset[1]};}
  const porchDepth=target.porchDepth??2.2;
  next.porch={x:next.doorX,z:next.front+target.direction*porchDepth/2,width:2.8,depth:porchDepth,stairs:[{id:'front',from:{x:next.doorX,y:next.rampLow,z:next.rampStart},to:{x:next.doorX,y:next.floorY,z:next.front+target.direction*porchDepth},width:2.2}]};
  if(old.wallTargets)next.wallTargets=old.wallTargets.map(t=>({...t,position:point(t.position)}));
  floor.layout=next;floor.alignmentEvidence={kind:'source-door-plane plus authored-gameplay adaptation',source:'data/reference/valentine/buildings/entrance-repair.json',yawDegrees:target.yawDegrees,note:config.evidence,terrainFoot:{...foot,y:next.rampLow},supersedes:'Earlier pivot/roof-height layout was not a verified ground-floor plane.'};
  const building=await read(id+'/building.json');
  if(target.upperFloorY!==undefined){
   const ref=building.interior.floorDefinitions.find(f=>f.id==='upper'),upper=await read(id+'/'+ref.file),previous=upper.layout;
   const delta=target.upperFloorY-previous.floorY;
   const upperPoint=p=>({...point(p),...('y'in p?{y:p.y+delta}:{})});
   upper.layout={...previous,x:next.x,z:next.z,width:next.width,depth:next.depth,yaw:next.yaw,floorY:target.upperFloorY,front:next.front,doorX:next.doorX,frontDirection:next.frontDirection,rampStart:next.rampStart,rampLow:target.upperFloorY,fixtures:previous.fixtures?.map(f=>({...f,position:upperPoint(f.position)})),floorHoles:previous.floorHoles?.map(h=>h.map(upperPoint))};
   delete upper.layout.porch;
   next.stairs=old.stairs?.map(s=>({...s,from:{...point(s.from),y:next.floorY},to:{...point(s.to),y:target.upperFloorY}}));
   upper.alignmentEvidence={kind:'authored-gameplay loft',source:'data/reference/valentine/buildings/entrance-repair.json',note:'Simplified connected loft, not a verified original floor.'};
   changes.push([id+'/'+ref.file,upper]);
  }
  for(const action of building.actions??[])for(const key of ['position','interactionPosition'])if(action[key])action[key]=point(action[key]);
  // Save only after all terrain measurements: editing imports reloads Vite.
  changes.push([file,floor],[id+'/building.json',building]);
 }
 const hotel=await read('hotel/building.json');
 if(!hotel.sourcePlacementIds.includes('valentine:6ebd826b625bcb3b')){hotel.sourcePlacementIds.push('valentine:6ebd826b625bcb3b');hotel.sourceAssets.push('models/valentine/val_hotel_ext_prch.glb');}
 const hotelFloor=await read('hotel/floors/ground.json'),h=hotelFloor.layout;
 for(const stair of h.porch.stairs){
  if(stair.id==='west'||stair.id==='east')stair.from.x=h.x+(stair.id==='west'?-1:1)*9.1;
  const foot=world(h,stair.from),height=await page.evaluate(p=>window.__rdoPreview.sampleGround(p.x,p.z),foot);
  if(!Number.isFinite(height)||Math.abs(height-h.floorY)>2.5)throw new Error('Unverified hotel terrain connection '+stair.id+' '+height);
  stair.from.y=height-.02;if(stair.id==='front')h.rampLow=stair.from.y;
 }
 changes.push(['hotel/building.json',hotel],['hotel/floors/ground.json',hotelFloor]);
 for(const [file,value] of changes)await writeFile(base+file,JSON.stringify(value,null,2)+'\n');
 console.log('Repaired authored entrances: '+Object.keys(config.buildings).join(', '));
}finally{await browser.close();}
